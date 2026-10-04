Zaimplementuj frontend asystenta AI pomagającego użytkownikom znaleźć programy, inicjatywy i projekty gminne dopasowane do ich sytuacji.

## Stack

Użyj istniejącego stacku projektu. Dla UI zakładamy:
- React / Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

W pierwszej kolejności używaj komponentów shadcn/ui.

Jeżeli potrzebnego elementu nie ma w shadcn/ui, utwórz reusable component.

Nie implementuj streamowania odpowiedzi. API zwraca kompletną odpowiedź JSON.

Nie implementuj logiki wyszukiwania ani podejmowania decyzji o tym, kiedy należy dopytać użytkownika. Jest to odpowiedzialność backendu.

## Cel produktu

Asystent pomaga użytkownikowi znaleźć programy gminne odpowiadające jego problemowi.

Głównymi użytkownikami mogą być:
- seniorzy,
- osoby wykluczone cyfrowo,
- osoby bezdomne,
- osoby bezrobotne,
- osoby znajdujące się w trudnej sytuacji życiowej,
- inne osoby mogące skorzystać z pomocy oferowanej przez gminę.

Użytkownik nie musi znać:
- nazw programów,
- struktury urzędu,
- formalnych nazw problemów,
- urzędowego języka.

Może po prostu opisać swoją sytuację.

## UX

Interfejs powinien być maksymalnie prosty.

Stosuj:
- prosty język,
- duże elementy interaktywne,
- czytelne CTA,
- wyraźny focus,
- wysoki kontrast,
- ograniczoną liczbę decyzji jednocześnie.

Nie wymagaj od użytkownika wpisywania tekstu, jeśli może łatwo odpowiedzieć kliknięciem.

Jednocześnie zawsze pozostaw możliwość napisania własnej wiadomości.

## Stan początkowy

Przed otrzymaniem rekomendacji chatbot znajduje się centralnie na stronie.

Pokaż:
- prosty nagłówek,
- krótkie wyjaśnienie,
- historię rozmowy,
- input,
- przycisk wysłania.

Przykład:

"Opisz, w czym potrzebujesz pomocy. Postaram się znaleźć odpowiednie programy i formy wsparcia."

Nie pokazuj pustego panelu rekomendacji.

## Stan z rekomendacjami

Po otrzymaniu response `recommendations` layout płynnie przechodzi do desktopowego widoku dwukolumnowego:

- ChatPanel
- RecommendationsPanel

Nie usuwaj ani nie resetuj historii rozmowy.

Na urządzeniach mobilnych zastosuj układ odpowiedni do małego ekranu zamiast dwóch bardzo wąskich kolumn.

## Dynamiczne clarification

Backend może zwrócić:

type: "clarification"

Frontend renderuje pytanie oraz przekazane opcje.

Backend określa:

selectionMode:
- "single"
- "multiple"

Dla single wykorzystaj np. shadcn RadioGroup.

Dla multiple wykorzystaj Checkbox.

Nie zakładaj dokładnie czterech opcji.

Typowo backend może zwrócić 2–5 opcji.

Każda opcja pochodzi z API.

Frontend nie generuje własnych opcji.

Jeżeli:

allowAdditionalText === true

pokaż również input umożliwiający wpisanie własnego doprecyzowania.

Przykład:

[x] Potrzebuję miejsca do spania
[x] Szukam pracy

Dodatkowe informacje:
"Nie mam również dokumentów."

Wyślij zaznaczone optionIds i dodatkowy tekst w jednym request.

## Chat input

Chat input pozostaje dostępny również po pokazaniu rekomendacji.

Użytkownik może napisać np.:

"Te propozycje mi nie pasują. Mam 72 lata."

Backend wykonuje wtedy ponowną analizę.

Może odpowiedzieć:
- nowymi rekomendacjami,
- pytaniem doprecyzowującym,
- zwykłą wiadomością.

Jeżeli pojawią się nowe rekomendacje, zastępują poprzednie.

Historia rozmowy pozostaje.

## RecommendationCard

Każdy program przedstaw jako reusable RecommendationCard.

Wyświetlaj:
- title,
- summary,
- matchExplanation,
- opcjonalne details,
- opcjonalny URL/CTA.

Przykład:

Cyfrowy Senior

Bezpłatne zajęcia pomagające seniorom korzystać z telefonu i internetu.

Dlaczego może Ci pomóc:
"Program dotyczy problemów z korzystaniem z usług cyfrowych."

Dla kogo:
"Osoby powyżej 60 lat."

[Dowiedz się więcej]

Nie pokazuj:
- similarity,
- vector distance,
- embeddingów,
- confidence modelu,
- wewnętrznych ranking scores.

## Eligibility

Frontend NIE stwierdza samodzielnie, że użytkownik kwalifikuje się do programu.

Jeżeli API zwraca eligibilityStatus, można pokazać:

- "eligible" → "Wygląda na to, że spełniasz podane warunki."
- "unknown" → "Nie mamy jeszcze wszystkich informacji, żeby sprawdzić warunki."

Nie przedstawiaj `unknown` jako potwierdzonego zakwalifikowania.

## Pagination

Backend zwraca stabilny searchId.

Pagination nie uruchamia nowej rozmowy ani nowego semantic search.

Dla kolejnych stron wykorzystaj endpoint:

GET /api/assistant/searches/:searchId?page=2&pageSize=3

Domyślnie:

pageSize = 3

Nowa wiadomość użytkownika może uruchomić nowe wyszukiwanie i zwrócić nowy searchId.

W takim przypadku resetuj widok wyników do page = 1.

## Loading

Nie ma streamingu.

Po wysłaniu wiadomości:
- pokaż stan loading,
- zablokuj ponowne wysłanie tego samego formularza,
- nie blokuj niepotrzebnie całej aplikacji.

Do wyników i rozmowy wykorzystuj odpowiednio komponenty Skeleton/Spinner.

## Errors

Obsłuż:
- network error,
- timeout,
- 4xx,
- 5xx,
- niepoprawny response,
- brak wyników.

Komunikaty błędów muszą być napisane prostym językiem.

Nigdy nie pokazuj stack trace ani technicznego błędu API użytkownikowi.

## Accessibility

Traktuj accessibility jako wymaganie produktu, nie późniejszy enhancement.

Zadbaj o:
- semantyczny HTML,
- pełną obsługę klawiatury,
- focus states,
- aria-label,
- poprawne labels,
- duże click/touch targets,
- odpowiedni kontrast,
- czytelną typografię,
- brak funkcji wymagających hover,
- brak kluczowych akcji dostępnych wyłącznie przez małe ikony.

## Komponenty

Preferowany podział:

AssistantPage
AssistantLayout

ChatPanel
ChatMessageList
ChatMessage
ChatInput

ClarificationQuestion
ClarificationSingleSelect
ClarificationMultiSelect
ClarificationAdditionalInput

RecommendationsPanel
RecommendationCard
RecommendationsPagination

AssistantLoadingState
RecommendationsSkeleton
AssistantError

Możesz zmienić dokładne nazwy, jeśli istniejąca architektura projektu sugeruje lepszy podział.

Nie twórz monolitycznego komponentu strony zawierającego całą logikę.

## API

Frontend musi korzystać ze wspólnego kontraktu API opisanego osobno.

Nie duplikuj typów ręcznie, jeśli projekt pozwala współdzielić TypeScript types/schema między frontendem i backendem.