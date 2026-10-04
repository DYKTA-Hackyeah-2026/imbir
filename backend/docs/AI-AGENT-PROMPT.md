Zaimplementuj backend asystenta AI pomagającego użytkownikom znaleźć odpowiednie programy gminne.

## Stack

Wykorzystaj:
- TypeScript
- PostgreSQL
- Drizzle ORM
- pgvector
- LLM
- embeddings

Nie implementuj streamowania.

API zwraca kompletne odpowiedzi JSON.

## Architektura

Oddziel odpowiedzialności:

- API / controllers
- conversation service
- LLM/orchestration service
- conversation state
- embedding provider
- program repository
- semantic search
- eligibility service
- ranking service
- search repository

Nie umieszczaj całej logiki w route handlerze.

PostgreSQL jest źródłem prawdy dotyczącym programów.

LLM nigdy nie może wymyślać programów.

## Główny flow

Po otrzymaniu wiadomości:

USER MESSAGE
↓
load conversation
↓
load ConversationState
↓
LLM analyzes new information
↓
update structured ConversationState
↓
decision:
SEARCH / CLARIFY / MESSAGE

Jeżeli CLARIFY:
↓
return clarification

Jeżeli SEARCH:
↓
create normalized searchQuery
↓
embedding
↓
pgvector candidate retrieval
↓
eligibility filtering
↓
ranking
↓
save stable Search
↓
return first page

## ConversationState

Nie polegaj wyłącznie na pełnej historii wiadomości.

Przechowuj aktualny ustrukturyzowany stan rozmowy.

Przykład:

type ConversationState = {
  summary: string;

  facts: {
    age?: number;
    location?: string;
    employmentStatus?: "employed" | "unemployed" | "inactive";
    housingStatus?: "homeless" | "at_risk" | "housed";
  };

  needs: string[];

  searchQuery?: string;
};

LLM aktualizuje state po nowych wiadomościach.

Nie usuwaj wcześniejszych informacji, chyba że użytkownik je poprawił.

Przykład:

User:
"Mam 72 lata."

Później:
"Przepraszam, mam 71."

Aktualny state powinien zawierać 71.

## Decyzja o clarification

Nie pytaj użytkownika o informacje tylko dlatego, że potencjalnie mogą być przydatne.

Pytanie powinno zostać zadane, jeżeli odpowiedź może istotnie zmienić rekomendacje.

Preferuj jedno pytanie naraz.

Przykład niejasnego requestu:

"Potrzebuję pomocy."

→ clarification.

Przykład konkretnego requestu:

"Mam 72 lata i nie umiem korzystać z paczkomatu."

→ można rozpocząć search bez zbędnego pytania.

## Clarification options

LLM może dynamicznie wygenerować opcje.

Output musi być structured output.

Przykład:

{
  "question": "Jakiej pomocy potrzebujesz?",
  "selectionMode": "multiple",
  "options": [
    {
      "id": "shelter",
      "label": "Miejsca do spania"
    },
    {
      "id": "job",
      "label": "Pomocy w znalezieniu pracy"
    }
  ]
}

Generuj typowo 2–5 opcji.

Używaj prostego języka.

`multiple` stosuj tylko wtedy, kiedy kilka odpowiedzi może być jednocześnie prawdziwych.

## Normalized search query

Nie embeddinguj wyłącznie ostatniej wiadomości.

LLM przygotowuje searchQuery reprezentujące aktualną potrzebę na podstawie ConversationState.

Przykład:

"Senior, 72 lata, potrzebuje podstawowego wsparcia w zakresie korzystania ze smartfona, internetu, paczkomatów i innych usług cyfrowych."

Embedding tworzony jest dla searchQuery.

## Programs

Program powinien zawierać zarówno treść dla użytkownika, jak i dane przeznaczone do wyszukiwania.

Minimalny model:

id
title
summary
description

targetGroups[]
topics[]
problemsAddressed[]

eligibility
eligibilityDescription

searchText
embedding

status
url
validFrom
validUntil

createdAt
updatedAt

## Eligibility

Structured eligibility może zawierać:

{
  minAge?: number;
  maxAge?: number;
  residentRequired?: boolean;

  employmentStatus?: [
    "employed",
    "unemployed",
    "inactive"
  ];

  housingStatus?: [
    "homeless",
    "at_risk",
    "housed"
  ];
}

Nie próbuj teraz implementować uniwersalnego rule engine.

Dodaj również:

eligibilityDescription

dla kryteriów, których nie reprezentujemy strukturalnie.

## searchText

Nie embeddinguj surowego description.

Przy tworzeniu lub aktualizacji programu wygeneruj deterministyczny searchText z danych programu.

Przykład:

Program: Cyfrowy Senior

Dla kogo:
- seniorzy
- osoby z niskimi kompetencjami cyfrowymi

Pomaga w:
- korzystaniu ze smartfona
- korzystaniu z internetu
- usługach cyfrowych
- obsłudze paczkomatów

Problemy:
- brak podstawowych kompetencji cyfrowych
- trudności z korzystaniem z usług cyfrowych

Opis:
...

Embedding jest generowany dla searchText.

Przechowuj searchText w bazie, żeby wyszukiwanie było możliwe do debugowania.

## Embedding provider

Nie wiąż domeny z konkretnym modelem.

Zdefiniuj interface:

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

Implementacja konkretnego providera znajduje się w infrastructure layer.

Dimensions muszą odpowiadać modelowi i kolumnie pgvector.

## pgvector

Wykorzystaj cosine distance.

Dodaj HNSW index używający:

vector_cosine_ops

ProgramRepository powinno wystawiać API w rodzaju:

semanticSearch({
  embedding,
  limit
})

Warstwa domenowa nie powinna budować SQL pgvector.

## Candidate retrieval

Nie pobieraj tylko 3 rekordów.

Domyślnie:

candidateLimit = 20

Flow:

pgvector TOP 20
↓
eligibility
↓
ranking
↓
stable search result

## Eligibility logic

Jawny konflikt może wykluczyć program.

Przykład:

user.age = 45
program.minAge = 65

→ conflict

Ale:

user.age = undefined
program.minAge = 65

→ unknown

Nie odrzucaj programu tylko dlatego, że użytkownik nie podał informacji.

Status:

"eligible"
"unknown"
"conflict"

Program z conflict nie powinien być normalnie rekomendowany.

Unknown może być rekomendowany, ale backend może wykorzystać brakującą informację do clarification.

## Search quality

Jeżeli semantic search daje słabe wyniki, nie rekomenduj przypadkowych programów tylko dlatego, że są najwyżej w rankingu.

Similarity threshold powinien być konfiguracją.

Jeżeli wyniki są niewystarczające, backend może zamiast recommendations zwrócić clarification.

Nie hardcoduj threshold w route handlerze.

## Stable searches

Każde wykonane wyszukiwanie utwórz jako Search.

Search przechowuje:
- id
- conversationId
- normalized query
- result ranking
- createdAt

Ranking musi być stabilny.

Pagination NIE wykonuje ponownie embeddingu ani vector search.

Przykład:

Search:

1 programA
2 programC
3 programB
4 programF
5 programG
...

page=1,pageSize=3:
1–3

page=2,pageSize=3:
4–6

Jeżeli użytkownik poda nowe informacje, utwórz nowy Search.

## Tables

Zaprojektuj co najmniej:

programs
conversations
messages
searches

Użyj Drizzle schema oraz migrations.

### programs

Przechowuje program oraz embedding.

### conversations

Przechowuje:
- id
- structured state
- timestamps

State może być JSONB, ale musi mieć TypeScript schema/type i validation.

### messages

Przechowuje:
- id
- conversationId
- role
- content
- createdAt

### searches

Przechowuje:
- id
- conversationId
- searchQuery
- resultIds/ranking
- timestamps

Nie ma potrzeby zapisywania query embeddingu, jeśli nie jest potrzebny do diagnostyki lub analityki.

## Program lifecycle

Przy CREATE/UPDATE programu:

validate
↓
save/update program
↓
build searchText
↓
generate embedding
↓
save embedding

Jeżeli pola wpływające na searchText nie zmieniły się, nie generuj embeddingu ponownie bez potrzeby.

## Hallucination protection

LLM nie może wymyślać:
- programów,
- nazw,
- adresów,
- URL,
- terminów,
- kryteriów,
- numerów telefonu,
- dostępności.

Recommendation response jest budowany wyłącznie na podstawie rekordów zwróconych przez repository.

LLM może stworzyć `matchExplanation`, ale wyłącznie na podstawie:
- ConversationState,
- danych konkretnego programu.

## Simple language

Odpowiedzi dla użytkownika:
- krótkie,
- konkretne,
- bez technicznego języka,
- bez niepotrzebnego języka urzędowego.

Preferuj jedno pytanie doprecyzowujące naraz.

## Extensibility

Przygotuj architekturę umożliwiającą późniejsze dodanie:
- hybrid search,
- full-text search,
- reranker,
- bardziej rozbudowanego eligibility engine,
- analytics,
- feedback użytkownika,
- streaming,
- innych embedding providers.

Nie implementuj ich teraz.