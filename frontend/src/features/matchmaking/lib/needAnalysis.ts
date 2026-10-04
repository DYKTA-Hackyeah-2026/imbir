import type {
  AnalyzeResult,
  AudienceId,
  ClarifyingQuestion,
  ClarifyingQuestionId,
  NeedDraft,
  NeedProfile,
  NeedTag,
} from "../types"

type DictionaryEntry = {
  keywords: string[]
  tags: NeedTag[]
  audiences: AudienceId[]
}

const DICTIONARY: DictionaryEntry[] = [
  {
    keywords: ["senior", "osob starsz", "starsz", "emeryt", "70 lat", "samotn", "izolac", "teleopiek", "niesamodziel"],
    tags: ["samotnosc", "izolacja-seniorow", "uslugi-spoleczne"],
    audiences: ["seniorzy"],
  },
  {
    keywords: ["cyfrow", "smartfon", "internet", "komputer", "online", "wykluczen", "tablet", "aplikacj"],
    tags: ["wykluczenie-cyfrowe", "kompetencje-cyfrowe", "edukacja"],
    audiences: ["seniorzy", "wolontariusze"],
  },
  {
    keywords: ["transport", "dojazd", "autobus", "komunikacj", "mobiln", "przewoz", "zawiez", "bus", "oddalon"],
    tags: ["transport", "mobilnosc"],
    audiences: ["seniorzy", "osoby-z-niepelnosprawnosciami"],
  },
  {
    keywords: ["psycholog", "psychiatr", "zdrowie psychiczn", "depresj", "kryzys", "stres", "samoboj", "emocj", "terapi", "lekow"],
    tags: ["wsparcie-psychologiczne", "zdrowie-psychiczne"],
    audiences: ["dzieci-i-mlodziez", "osoby-w-kryzysie"],
  },
  {
    keywords: ["uzalezn", "alkohol", "narkotyk", "nalog", "pij", "narkoman"],
    tags: ["uzaleznienia", "zdrowie-psychiczne"],
    audiences: ["osoby-w-kryzysie"],
  },
  {
    keywords: ["bezrobot", "praca", "zatrudnien", "aktywizac", "zawodow", "przekwalifik", "poszukiwani", "firma"],
    tags: ["aktywizacja-zawodowa", "bezrobocie"],
    audiences: ["osoby-bezrobotne"],
  },
  {
    keywords: ["rodzin", "wychow", "piecza", "samotn matk", "samotn ojc"],
    tags: ["wsparcie-rodzin"],
    audiences: ["rodziny"],
  },
  {
    keywords: ["dziec", "mlodziez", "nastolat", "przedszkol", "szkol"],
    tags: ["edukacja", "wsparcie-rodzin"],
    audiences: ["dzieci-i-mlodziez"],
  },
  {
    keywords: ["przemoc", "molest", "interwencj kryzysow", "niebiesk karta", "agresj"],
    tags: ["przemoc-domowa", "wsparcie-rodzin"],
    audiences: ["osoby-w-kryzysie", "rodziny"],
  },
  {
    keywords: ["bezdom", "ubog", "ubostw", "noclegowni", "schronisk", "mieszkal", "lokal", "czynsz", "eksmisj"],
    tags: ["bezdomnosc", "mieszkalnictwo", "uslugi-spoleczne"],
    audiences: ["osoby-bezdomne", "osoby-w-kryzysie"],
  },
  {
    keywords: ["migrant", "uchodzc", "cudzoziem", "obcokrajow", "imigrant", "jezyk polsk", "kultura"],
    tags: ["integracja-migrantow", "edukacja", "kultura"],
    audiences: ["migranci-i-uchodzcy"],
  },
  {
    keywords: ["ukrain"],
    tags: ["wsparcie-dla-ukrainy", "integracja-migrantow"],
    audiences: ["osoby-z-ukrainy"],
  },
  {
    keywords: ["niepelnosprawn", "inwalid", "wozek", "barier", "dostepno", "niewidom", "gluch", "autyz", "rehabilitac"],
    tags: ["dostępnosc", "uslugi-spoleczne"],
    audiences: ["osoby-z-niepelnosprawnosciami"],
  },
  {
    keywords: ["aktywnosc fizyczn", "sport", "rekreacj", "ruch", "rower", "basen", "taniec", "wycieczk"],
    tags: ["aktywnosc-fizyczna", "kultura"],
    audiences: ["dzieci-i-mlodziez", "seniorzy"],
  },
  {
    keywords: ["kultura", "sztuk", "teatr", "bibliotek", "swietlic", "dom kultury", "muze", "koncert"],
    tags: ["kultura", "partycypacja"],
    audiences: ["spolecznosc-lokalna"],
  },
  {
    keywords: ["wolontar", "sasiedz", "pomoc sasiedz", "zorganizowac mieszkanc"],
    tags: ["wolontariat", "wsparcie-sasiedzkie"],
    audiences: ["wolontariusze", "spolecznosc-lokalna"],
  },
  {
    keywords: ["zywnosc", "jedzenie", "posilek", "glod", "darmow posil", "paczk"],
    tags: ["pomoc-zywnosciowa"],
    audiences: ["rodziny", "osoby-w-kryzysie"],
  },
  {
    keywords: ["ekolog", "ogrod", "zielen", "recykling", "klimat", "smog", "odpadow"],
    tags: ["ekologia"],
    audiences: ["spolecznosc-lokalna", "wolontariusze"],
  },
  {
    keywords: ["partycypac", "konsultacj", "wspolnot", "rada", "inicjatyw lokaln", "zaangazow"],
    tags: ["partycypacja"],
    audiences: ["spolecznosc-lokalna"],
  },
  {
    keywords: ["edukac", "nauka", "korepetycj", "czytanie", "lekcj", "kompetencj"],
    tags: ["edukacja"],
    audiences: ["dzieci-i-mlodziez", "rodziny"],
  },
  {
    keywords: ["spoldzieln", "przedsiebiorcz", "dzialalnosc gospodar", "socjaln", "inkubator", "spoldzielnia"],
    tags: ["przedsiebiorczosc-spoleczna", "aktywizacja-zawodowa"],
    audiences: ["osoby-bezrobotne"],
  },
  {
    keywords: ["opieka", "dlugotermin", "starsz", "hospicjum", "pielegnac"],
    tags: ["opieka-dlugoterminowa", "uslugi-spoleczne"],
    audiences: ["seniorzy", "osoby-z-niepelnosprawnosciami"],
  },
  {
    keywords: ["piecza", "zastepcz", "adopc", "rodzin zastep"],
    tags: ["piecza-zastepcza", "wsparcie-rodzin"],
    audiences: ["rodziny", "dzieci-i-mlodziez"],
  },
  {
    keywords: ["samotn", "osamotnien", "izolac", "odciecie", "brak kontaktu"],
    tags: ["samotnosc"],
    audiences: ["seniorzy"],
  },
  {
    keywords: ["wsparcie", "pomoc", "wspier", "uslug", "aktywizac"],
    tags: ["uslugi-spoleczne"],
    audiences: [],
  },
]

const OUTCOME_KEYWORDS = [
  "samodzieln",
  "bezpiecz",
  "integrac",
  "zdrow",
  "praca",
  "zatrudnien",
  "dostepn",
  "usamodzieln",
  "zmniejsz",
  "popraw",
  "wzrost",
  "wzmacnia",
  "wlaczen",
  "aktywizac",
]

const DIACRITICS: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
}

export function normalize(input: string): string {
  return input.toLowerCase().replace(/[ąćęłńóśźż]/g, (char) => DIACRITICS[char] ?? char)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function containsKeyword(haystack: string, keyword: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}`).test(haystack)
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function collect(text: string, field: "tags" | "audiences"): string[] {
  const haystack = normalize(text)
  const found: string[] = []
  for (const entry of DICTIONARY) {
    if (entry.keywords.some((keyword) => containsKeyword(haystack, keyword))) {
      found.push(...entry[field])
    }
  }
  return unique(found)
}

export function parseNeed(
  draft: NeedDraft,
  answers: Partial<Record<ClarifyingQuestionId, string>> = {}
): NeedProfile {
  const answerValues = [answers.audience, answers.outcome].filter(Boolean) as string[]
  const combined = [
    draft.description,
    draft.whoNeedsSupport,
    draft.desiredOutcome,
    draft.accessibilityNeeds,
    ...answerValues,
  ]
    .filter(Boolean)
    .join(" ")

  const tags = collect(combined, "tags") as NeedTag[]
  const audiences = collect(combined, "audiences") as AudienceId[]
  const normalized = normalize(combined)
  const outcomeKeywords = OUTCOME_KEYWORDS.filter((keyword) =>
    containsKeyword(normalized, keyword)
  )

  const municipality = answers.location?.trim() || draft.municipality.trim()
  const county = draft.county.trim()

  return {
    draft,
    tags,
    audiences,
    location: {
      municipality: municipality || undefined,
      county: county || undefined,
      region: "Małopolska",
    },
    outcomeKeywords,
    answers: {
      audience: answers.audience ?? "",
      location: answers.location ?? "",
      outcome: answers.outcome ?? "",
      resources: answers.resources ?? "",
    },
  }
}

const AUDIENCE_OPTIONS = [
  { value: "seniorzy", label: "Osoby starsze (seniorzy)" },
  { value: "dzieci-i-mlodziez", label: "Dzieci i młodzież" },
  { value: "rodziny", label: "Rodziny" },
  { value: "osoby-z-niepelnosprawnosciami", label: "Osoby z niepełnosprawnościami" },
  { value: "osoby-w-kryzysie", label: "Osoby w kryzysie" },
  { value: "osoby-bezdomne", label: "Osoby bezdomne" },
  { value: "migranci-i-uchodzcy", label: "Migranci i uchodźcy" },
]

export function buildQuestions(
  draft: NeedDraft,
  answers: Partial<Record<ClarifyingQuestionId, string>>,
  profile: NeedProfile
): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = []

  if (!draft.whoNeedsSupport.trim() && !answers.audience && profile.audiences.length === 0) {
    questions.push({
      id: "audience",
      question: "Kto przede wszystkim potrzebuje wsparcia?",
      helpText: "Wybierz najważniejszą grupę. Możesz też dopisać własną odpowiedź.",
      options: AUDIENCE_OPTIONS,
      allowOther: true,
    })
  }

  if (!profile.location.municipality && !profile.location.county && !answers.location) {
    questions.push({
      id: "location",
      question: "Gdzie występuje ta potrzeba?",
      helpText: "Podaj gminę, miejscowość lub powiat, jeśli to możliwe.",
      options: [
        { value: "Kraków", label: "Kraków" },
        { value: "Nowy Sącz", label: "Nowy Sącz" },
        { value: "Tarnów", label: "Tarnów" },
        { value: "Cała Małopolska", label: "Cała Małopolska" },
      ],
      allowOther: true,
    })
  }

  if (!draft.desiredOutcome.trim() && !answers.outcome && profile.outcomeKeywords.length === 0) {
    questions.push({
      id: "outcome",
      question: "Jaki rezultat jest dla Ciebie najważniejszy?",
      helpText: "Wystarczy krótka odpowiedź, np. poprawa samodzielności seniorów.",
      options: [
        { value: "Włączenie społeczne i integracja", label: "Włączenie społeczne i integracja" },
        { value: "Poprawa samodzielności i bezpieczeństwa", label: "Poprawa samodzielności i bezpieczeństwa" },
        { value: "Wsparcie zdrowia psychicznego", label: "Wsparcie zdrowia psychicznego" },
        { value: "Aktywizacja zawodowa", label: "Aktywizacja zawodowa" },
        { value: "Poprawa dostępności", label: "Poprawa dostępności usług i miejsc" },
      ],
      allowOther: true,
    })
  }

  if (
    !draft.availableResources.trim() &&
    !draft.budget.trim() &&
    !answers.resources &&
    questions.length < 3
  ) {
    questions.push({
      id: "resources",
      question: "Jakimi zasobami dysponujesz na start?",
      helpText:
        "To pomaga ocenić, czy dane rozwiązanie jest możliwe do wdrożenia. Odpowiedź nie jest obowiązkowa.",
      options: [
        { value: "Mamy lokal i zespół", label: "Mamy lokal i zespół" },
        { value: "Mamy tylko wolontariuszy", label: "Mamy tylko wolontariuszy" },
        { value: "Mamy budżet, brakuje kadry", label: "Mamy budżet, brakuje kadry" },
        { value: "Zaczynamy praktycznie od zera", label: "Zaczynamy praktycznie od zera" },
      ],
      allowOther: true,
    })
  }

  return questions.slice(0, 3)
}

export function analyzeNeed(
  draft: NeedDraft,
  answers: Partial<Record<ClarifyingQuestionId, string>> = {}
): AnalyzeResult {
  const profile = parseNeed(draft, answers)
  return { profile, questions: buildQuestions(draft, answers, profile) }
}
