Nowy kontrakt API
Tutaj zrobiłbym jedną ważną zmianę: pagination nie przechodzi już przez endpoint wiadomości.
Mamy dwa główne endpointy.
POST /api/assistant/messages
GET  /api/assistant/searches/:searchId

1. Wysłanie wiadomości
POST /api/assistant/messages

Request:
type SendAssistantMessageRequest = {
  conversationId?: string;

  message:
    | TextMessageInput
    | ClarificationAnswerInput;
};

type TextMessageInput = {
  type: "text";
  text: string;
};

type ClarificationAnswerInput = {
  type: "clarification_answer";

  questionId: string;

  selectedOptionIds: string[];

  additionalText?: string;
};

Pierwszy request nie ma conversationId:
{
  "message": {
    "type": "text",
    "text": "Mam 72 lata i nie umiem korzystać z paczkomatu."
  }
}

Backend tworzy conversation.
Kolejne:
{
  "conversationId": "conv_123",
  "message": {
    "type": "text",
    "text": "Mam też problem z bankowością internetową."
  }
}

Response union
type SendAssistantMessageResponse =
  | ClarificationResponse
  | RecommendationsResponse
  | AssistantMessageResponse;

Clarification
type ClarificationResponse = {
  type: "clarification";

  conversationId: string;

  assistantMessage: string;

  clarification: {
    id: string;

    question: string;

    selectionMode:
      | "single"
      | "multiple";

    options: Array<{
      id: string;
      label: string;
    }>;

    allowAdditionalText: boolean;
  };
};

Przykład:
{
  "type": "clarification",
  "conversationId": "conv_123",
  "assistantMessage": "Chcę lepiej zrozumieć, jakiej pomocy potrzebujesz.",
  "clarification": {
    "id": "question_456",
    "question": "Jakiej pomocy potrzebujesz teraz najbardziej?",
    "selectionMode": "multiple",
    "options": [
      {
        "id": "shelter",
        "label": "Miejsca do spania"
      },
      {
        "id": "job",
        "label": "Pomocy w znalezieniu pracy"
      },
      {
        "id": "food",
        "label": "Pomocy z jedzeniem"
      },
      {
        "id": "documents",
        "label": "Pomocy z dokumentami"
      }
    ],
    "allowAdditionalText": true
  }
}

Frontend odpowiada:
{
  "conversationId": "conv_123",
  "message": {
    "type": "clarification_answer",
    "questionId": "question_456",
    "selectedOptionIds": [
      "shelter",
      "job"
    ],
    "additionalText": "Potrzebuję też pomocy z dokumentami."
  }
}

RecommendationsResponse
type RecommendationsResponse = {
  type: "recommendations";

  conversationId: string;

  assistantMessage: string;

  search: {
    id: string;

    recommendations: Recommendation[];

    pagination: Pagination;
  };
};

Recommendation:
type Recommendation = {
  id: string;

  title: string;
  summary: string;

  matchExplanation: string;

  eligibilityStatus:
    | "eligible"
    | "unknown";

  eligibilityDescription?: string;

  details: Array<{
    label: string;
    value: string;
  }>;

  url?: string;
};

Celowo nie zwracałbym conflict do frontendu jako normalnej rekomendacji. Backend powinien taki program usunąć przed zbudowaniem response.
Pagination:
type Pagination = {
  page: number;
  pageSize: number;

  totalResults: number;
  totalPages: number;

  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

Przykład:
{
  "type": "recommendations",
  "conversationId": "conv_123",
  "assistantMessage": "Znalazłem kilka programów, które mogą Ci pomóc.",
  "search": {
    "id": "search_789",
    "recommendations": [
      {
        "id": "program_42",
        "title": "Cyfrowy Senior",
        "summary": "Bezpłatna pomoc w korzystaniu z telefonu, internetu i usług cyfrowych.",
        "matchExplanation": "Program pomaga seniorom, którzy mają trudności z korzystaniem z usług cyfrowych.",
        "eligibilityStatus": "eligible",
        "eligibilityDescription": "Program dla mieszkańców gminy powyżej 60 lat.",
        "details": [
          {
            "label": "Dla kogo",
            "value": "Osoby powyżej 60 lat"
          },
          {
            "label": "Tematy",
            "value": "Internet, smartfon i usługi cyfrowe"
          }
        ],
        "url": "/programs/program_42"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 3,
      "totalResults": 8,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}

2. Pagination
GET /api/assistant/searches/:searchId?page=2&pageSize=3

Response:
type SearchPageResponse = {
  searchId: string;

  recommendations: Recommendation[];

  pagination: Pagination;
};

Ten endpoint:
nie wywołuje LLM → nie generuje embeddingu → nie wykonuje ponownie vector search.
Czyta zapisany ranking:
search_789

[
  program_42,
  program_91,
  program_18,
  program_55,
  program_12,
  ...
]

i zwraca odpowiedni slice.
Model danych Drizzle
Dałbym agentowi również ten punkt startowy:
export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),

  title: text("title").notNull(),
  summary: text("summary").notNull(),
  description: text("description").notNull(),

  targetGroups: text("target_groups").array().notNull(),
  topics: text("topics").array().notNull(),
  problemsAddressed: text("problems_addressed")
    .array()
    .notNull(),

  eligibility: jsonb("eligibility")
    .$type<ProgramEligibility>(),

  eligibilityDescription:
    text("eligibility_description"),

  searchText: text("search_text").notNull(),

  embedding: vector("embedding", {
    dimensions: EMBEDDING_DIMENSIONS,
  }),

  status: text("status")
    .$type<ProgramStatus>()
    .notNull(),

  url: text("url"),

  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});

Do tego:
conversations
messages
searches

Przy searches.resultIds rozważyłbym nawet osobną tabelę search_results zamiast JSON array:
search_results

searchId
programId
position
similarity
eligibilityStatus

To będzie trochę więcej kodu teraz, ale moim zdaniem lepszy model docelowy. Dostajecie łatwą paginację SQL, analitykę, debugowanie rankingu i możliwość późniejszego dodania rerankerScore czy finalScore bez migracji JSON-owych blobów.
Czyli finalnie:
programs

conversations
  └── messages

conversations
  └── searches
        └── search_results
              └── programs

To jest wariant, który wybrałbym do implementacji zamiast przechowywania całego rankingu jako resultIds: jsonb.