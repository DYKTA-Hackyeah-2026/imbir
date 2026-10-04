import type { InnovationPayload, InnovationRecord, InnovationStatus } from "@/lib/innovations"

export type ChoiceOption<T extends string> = {
  value: T
  label: string
  description?: string
  emoji?: string
}

export const INNOVATION_TYPE_OPTIONS = [
  "Produkt",
  "Usługa",
  "Proces lub metoda",
  "Model współpracy",
  "Technologia cyfrowa",
  "Inne",
] as const

export type ProblemIntensity = "very_serious" | "strong" | "moderate" | "light"

export const INTENSITY_OPTIONS: ChoiceOption<ProblemIntensity>[] = [
  {
    value: "very_serious",
    label: "Bardzo poważny problem",
    description: "Powoduje stres, wykluczenie lub realną krzywdę.",
    emoji: "🔥",
  },
  {
    value: "strong",
    label: "Mocno przeszkadza",
    description: "Problem regularnie blokuje ważne działania.",
    emoji: "😟",
  },
  {
    value: "moderate",
    label: "Utrudnia działanie",
    description: "Trzeba szukać alternatyw, traci się czas lub energię.",
    emoji: "😕",
  },
  {
    value: "light",
    label: "Lekko przeszkadza",
    description: "Da się żyć, problem raczej irytuje niż blokuje.",
    emoji: "🙂",
  },
]

export type ProblemFrequency = "very_often" | "often" | "sometimes" | "rarely"

export const FREQUENCY_OPTIONS: ChoiceOption<ProblemFrequency>[] = [
  { value: "very_often", label: "Bardzo często", description: "Codziennie albo prawie codziennie." },
  { value: "often", label: "Często", description: "Co tydzień lub regularnie." },
  { value: "sometimes", label: "Czasami", description: "Kilka razy w roku lub miesiącu." },
  { value: "rarely", label: "Rzadko", description: "Raz na jakiś czas – raz w roku lub rzadziej." },
]

export type ProblemScale = "individuals" | "narrow_group" | "large_group" | "very_large_group"

export const SCALE_OPTIONS: ChoiceOption<ProblemScale>[] = [
  { value: "individuals", label: "Pojedyncze osoby" },
  { value: "narrow_group", label: "Niewielka grupa" },
  { value: "large_group", label: "Duża grupa" },
  { value: "very_large_group", label: "Bardzo duża grupa" },
]

export const AUDIENCE_OPTIONS = [
  "Dzieci",
  "Młodzież",
  "Rodzice",
  "Dorośli",
  "Seniorzy",
  "Osoby z niepełnosprawnościami",
  "Inne grupy",
] as const

export const AREA_OPTIONS = [
  "Moja gmina",
  "Mój powiat",
  "Cała Małopolska",
  "Cała Polska",
  "Online",
  "Inne",
] as const

export type Affordability =
  | "high_value_low_cost"
  | "benefit_greater_than_cost"
  | "cost_equals_benefit"
  | "cost_greater_than_benefit"

export const AFFORDABILITY_OPTIONS: ChoiceOption<Affordability>[] = [
  { value: "high_value_low_cost", label: "Duże korzyści, niskie koszty" },
  { value: "benefit_greater_than_cost", label: "Korzyści przewyższają koszty" },
  { value: "cost_equals_benefit", label: "Koszty są równe korzyściom" },
  { value: "cost_greater_than_benefit", label: "Koszty przewyższają korzyści" },
]

export type Simplicity = "unclear" | "partially_clear" | "clear" | "users_can_explain"

export const SIMPLICITY_OPTIONS: ChoiceOption<Simplicity>[] = [
  { value: "users_can_explain", label: "Bardzo proste", description: "Użytkownicy sami wyjaśnią, jak działa." },
  { value: "clear", label: "Jasne", description: "Od razu wiadomo, jak z niego korzystać." },
  { value: "partially_clear", label: "Częściowo jasne", description: "Niektóre elementy wymagają wyjaśnienia." },
  { value: "unclear", label: "Wymaga wyjaśnień", description: "Potrzebne są instrukcje lub wsparcie." },
]

export type RevenueValidation = "unknown" | "idea" | "concrete_proposal" | "confirmed"

export const REVENUE_VALIDATION_OPTIONS: ChoiceOption<RevenueValidation>[] = [
  { value: "unknown", label: "Jeszcze nie wiem" },
  { value: "idea", label: "Mam pomysł" },
  { value: "concrete_proposal", label: "Konkretny plan" },
  { value: "confirmed", label: "Potwierdzone źródło" },
]

export type RevenueScalability =
  | "no_additional_sources"
  | "possible_additional_sources"
  | "real_growth_paths"
  | "replicable"

export const REVENUE_SCALABILITY_OPTIONS: ChoiceOption<RevenueScalability>[] = [
  { value: "no_additional_sources", label: "Jedna podstawa finansowania" },
  { value: "possible_additional_sources", label: "Możliwe dodatkowe źródła" },
  { value: "real_growth_paths", label: "Realne ścieżki wzrostu" },
  { value: "replicable", label: "Model powtarzalny" },
]

export type TeamMemberDraft = {
  name: string
  role: string
  organization: string
}

export type PartnerDraft = {
  name: string
  description: string
}

export type CostDraft = {
  name: string
  type: "fixed" | "variable"
  amount: string
}

export type CreatorDraft = {
  title: string
  description: string
  innovationType: string
  problemDescription: string
  problemImportant: string
  problemSources: string
  problemIntensity: ProblemIntensity | ""
  problemFrequency: ProblemFrequency | ""
  problemScale: ProblemScale | ""
  challengesMapReference: string
  audiences: string[]
  areas: string[]
  audienceNotes: string
  audienceNeeds: string
  exclusionRiskDescription: string
  solutionDescription: string
  existingSolutions: string
  expectedChange: string
  planSteps: string
  futureVision: string
  teamExperience: string
  teamMembers: TeamMemberDraft[]
  partners: PartnerDraft[]
  costs: CostDraft[]
  socialInclusionImpact: string
  scalabilityDescription: string
  simplicity: Simplicity | ""
  affordability: Affordability | ""
  grantAmount: string
  revenueValidation: RevenueValidation | ""
  revenueMainSource: string
  revenueScalability: RevenueScalability | ""
  revenueAdditionalSource: string
}

export const EMPTY_DRAFT: CreatorDraft = {
  title: "",
  description: "",
  innovationType: "",
  problemDescription: "",
  problemImportant: "",
  problemSources: "",
  problemIntensity: "",
  problemFrequency: "",
  problemScale: "",
  challengesMapReference: "",
  audiences: [],
  areas: [],
  audienceNotes: "",
  audienceNeeds: "",
  exclusionRiskDescription: "",
  solutionDescription: "",
  existingSolutions: "",
  expectedChange: "",
  planSteps: "",
  futureVision: "",
  teamExperience: "",
  teamMembers: [],
  partners: [],
  costs: [],
  socialInclusionImpact: "",
  scalabilityDescription: "",
  simplicity: "",
  affordability: "",
  grantAmount: "",
  revenueValidation: "",
  revenueMainSource: "",
  revenueScalability: "",
  revenueAdditionalSource: "",
}

export type CreatorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const STEP_COUNT = 8
export const TEXT_LIMIT = 500

export const STEPS: { step: CreatorStep; title: string; subtitle: string }[] = [
  {
    step: 1,
    title: "Podstawowe informacje",
    subtitle: "Tu opiszesz swój pomysł w skrócie – te informacje pomogą innym szybko go zrozumieć.",
  },
  {
    step: 2,
    title: "Problem społeczny i uzasadnienie",
    subtitle: "Opisz problem, który rozwiązujesz i wyjaśnij, dlaczego jest ważny.",
  },
  {
    step: 3,
    title: "Odbiorcy i obszar działania",
    subtitle: "Określ, do kogo kierujesz rozwiązanie i gdzie będzie działać.",
  },
  {
    step: 4,
    title: "Rozwiązanie",
    subtitle: "Pokaż, na czym polega Twój pomysł i co go wyróżnia.",
  },
  {
    step: 5,
    title: "Plan realizacji",
    subtitle: "Opisz, jak zamierzasz zrealizować pomysł i co będzie potrzebne.",
  },
  {
    step: 6,
    title: "Zasoby i partnerzy",
    subtitle: "Wskaż osoby, organizacje i zasoby, które pomogą wdrożyć rozwiązanie.",
  },
  {
    step: 7,
    title: "Efekty i ewaluacja",
    subtitle: "Określ, jakie zmiany przyniesie rozwiązanie i jak je zmierzysz.",
  },
  {
    step: 8,
    title: "Generator wniosku (opcjonalnie)",
    subtitle: "Przygotuj informacje potrzebne do wniosku o finansowanie.",
  },
]

export type DraftErrors = Partial<Record<keyof CreatorDraft, string>>

export function validateStep(step: CreatorStep, draft: CreatorDraft): DraftErrors {
  const errors: DraftErrors = {}
  if (step === 1) {
    if (draft.title.trim().length < 3) {
      errors.title = "Podaj nazwę pomysłu (co najmniej 3 znaki)."
    }
    if (draft.description.trim().length < 20) {
      errors.description = "Opisz pomysł w co najmniej kilku zdaniach (minimum 20 znaków)."
    }
  }
  if (step === 2) {
    if (draft.problemDescription.trim().length < 20) {
      errors.problemDescription = "Opisz problem społeczny (minimum 20 znaków)."
    }
    if (draft.problemImportant.trim().length < 10) {
      errors.problemImportant = "Wyjaśnij, dlaczego problem jest ważny."
    }
    if (!draft.problemIntensity) {
      errors.problemIntensity = "Zaznacz intensywność problemu."
    }
    if (!draft.problemFrequency) {
      errors.problemFrequency = "Zaznacz częstotliwość występowania problemu."
    }
  }
  if (step === 3) {
    if (draft.audiences.length === 0) {
      errors.audiences = "Wybierz co najmniej jedną grupę docelową."
    }
    if (draft.areas.length === 0) {
      errors.areas = "Wybierz co najmniej jeden obszar działania."
    }
  }
  if (step === 4) {
    if (draft.solutionDescription.trim().length < 20) {
      errors.solutionDescription = "Opisz swoje rozwiązanie (minimum 20 znaków)."
    }
    if (draft.expectedChange.trim().length < 10) {
      errors.expectedChange = "Opisz oczekiwaną zmianę."
    }
  }
  if (step === 8 && draft.grantAmount.trim().length > 0) {
    const amount = Number(draft.grantAmount)
    if (!Number.isFinite(amount) || amount < 0) {
      errors.grantAmount = "Podaj kwotę jako liczbę (np. 25000)."
    }
  }
  return errors
}

export function validateAll(draft: CreatorDraft): { step: CreatorStep; errors: DraftErrors }[] {
  const results: { step: CreatorStep; errors: DraftErrors }[] = []
  for (const meta of STEPS) {
    const errors = validateStep(meta.step, draft)
    if (Object.keys(errors).length > 0) results.push({ step: meta.step, errors })
  }
  return results
}

const AREA_PREFIX = "Obszar działania: "

function parseAudienceDescription(text: string | null): { areas: string[]; notes: string } {
  if (!text) return { areas: [], notes: "" }
  const lines = text.split("\n")
  const areaLine = lines.find((line) => line.startsWith(AREA_PREFIX))
  const areas = areaLine
    ? areaLine
        .slice(AREA_PREFIX.length)
        .replace(/\.\s*$/, "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const notes = lines
    .filter((line) => !line.startsWith(AREA_PREFIX))
    .join("\n")
    .trim()
  return { areas, notes }
}

export function toPayload(
  draft: CreatorDraft,
  status: InnovationStatus,
  currentStep: number,
): InnovationPayload {
  const audienceDescription = [
    draft.audienceNotes.trim(),
    draft.areas.length > 0 ? `${AREA_PREFIX}${draft.areas.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const hasProblem = Boolean(draft.problemIntensity || draft.problemFrequency || draft.problemScale)
  const hasRevenue = Boolean(
    draft.revenueValidation ||
      draft.revenueMainSource.trim() ||
      draft.revenueScalability ||
      draft.revenueAdditionalSource.trim(),
  )

  return {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    innovationType: draft.innovationType || null,
    problemDescription: draft.problemDescription.trim() || null,
    problemStatistics: draft.problemImportant.trim() || null,
    problemSources: draft.problemSources.trim() || null,
    socialChallengesMapReference: draft.challengesMapReference.trim() || null,
    innovationUniqueness: draft.solutionDescription.trim() || null,
    existingSolutions: draft.existingSolutions.trim() || null,
    expectedChange: draft.expectedChange.trim() || null,
    implementationEase: draft.planSteps.trim() || null,
    futureVision: draft.futureVision.trim() || null,
    audienceDescription: audienceDescription || null,
    audienceNeeds: draft.audienceNeeds.trim() || null,
    exclusionRiskDescription: draft.exclusionRiskDescription.trim() || null,
    socialInclusionImpact: draft.socialInclusionImpact.trim() || null,
    scalabilityDescription: draft.scalabilityDescription.trim() || null,
    teamExperience: draft.teamExperience.trim() || null,
    affordability: draft.affordability || null,
    simplicity: draft.simplicity || null,
    requestedGrantAmount: draft.grantAmount.trim() ? Number(draft.grantAmount) : null,
    status,
    currentStep,
    problem: hasProblem
      ? {
          intensity: draft.problemIntensity || null,
          frequency: draft.problemFrequency || null,
          scale: draft.problemScale || null,
        }
      : undefined,
    audiences: draft.audiences.map((value) => ({ type: "main_user", value })),
    actors: draft.partners
      .filter((partner) => partner.name.trim())
      .map((partner) => ({
        type: "supports_change",
        name: partner.name.trim(),
        description: partner.description.trim() || null,
      })),
    costs: draft.costs
      .filter((cost) => cost.name.trim())
      .map((cost) => ({
        type: cost.type,
        name: cost.name.trim(),
        amount: cost.amount.trim() ? Number(cost.amount) : null,
        description: null,
      })),
    revenue: hasRevenue
      ? {
          validation: draft.revenueValidation || null,
          mainSource: draft.revenueMainSource.trim() || null,
          scalability: draft.revenueScalability || null,
          additionalSource: draft.revenueAdditionalSource.trim() || null,
        }
      : undefined,
    teamMembers: draft.teamMembers
      .filter((member) => member.name.trim())
      .map((member) => ({
        name: member.name.trim(),
        role: member.role.trim() || null,
        organization: member.organization.trim() || null,
      })),
  }
}

export function fromRecord(record: InnovationRecord): CreatorDraft {
  const { areas, notes } = parseAudienceDescription(record.audienceDescription)
  return {
    ...EMPTY_DRAFT,
    title: record.title ?? "",
    description: record.description ?? "",
    innovationType: record.innovationType ?? "",
    problemDescription: record.problemDescription ?? "",
    problemImportant: record.problemStatistics ?? "",
    problemSources: record.problemSources ?? "",
    problemIntensity: (record.problem?.intensity as ProblemIntensity | null) ?? "",
    problemFrequency: (record.problem?.frequency as ProblemFrequency | null) ?? "",
    problemScale: (record.problem?.scale as ProblemScale | null) ?? "",
    challengesMapReference: record.socialChallengesMapReference ?? "",
    audiences: (record.audiences ?? []).map((entry) => entry.value),
    areas,
    audienceNotes: notes,
    audienceNeeds: record.audienceNeeds ?? "",
    exclusionRiskDescription: record.exclusionRiskDescription ?? "",
    solutionDescription: record.innovationUniqueness ?? "",
    existingSolutions: record.existingSolutions ?? "",
    expectedChange: record.expectedChange ?? "",
    planSteps: record.implementationEase ?? "",
    futureVision: record.futureVision ?? "",
    teamExperience: record.teamExperience ?? "",
    teamMembers: (record.teamMembers ?? []).map((member) => ({
      name: member.name,
      role: member.role ?? "",
      organization: member.organization ?? "",
    })),
    partners: (record.actors ?? []).map((actor) => ({
      name: actor.name,
      description: actor.description ?? "",
    })),
    costs: (record.costs ?? []).map((cost) => ({
      name: cost.name,
      type: cost.type === "variable" ? "variable" : "fixed",
      amount: cost.amount ?? "",
    })),
    socialInclusionImpact: record.socialInclusionImpact ?? "",
    scalabilityDescription: record.scalabilityDescription ?? "",
    simplicity: (record.simplicity as Simplicity | null) ?? "",
    affordability: (record.affordability as Affordability | null) ?? "",
    grantAmount: record.requestedGrantAmount ?? "",
    revenueValidation: (record.revenue?.validation as RevenueValidation | null) ?? "",
    revenueMainSource: record.revenue?.mainSource ?? "",
    revenueScalability: (record.revenue?.scalability as RevenueScalability | null) ?? "",
    revenueAdditionalSource: record.revenue?.additionalSource ?? "",
  }
}
