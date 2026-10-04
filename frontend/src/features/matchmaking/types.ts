export type AudienceId =
  | "seniorzy"
  | "osoby-z-niepelnosprawnosciami"
  | "dzieci-i-mlodziez"
  | "rodziny"
  | "osoby-w-kryzysie"
  | "osoby-bezdomne"
  | "migranci-i-uchodzcy"
  | "osoby-z-ukrainy"
  | "spolecznosc-lokalna"
  | "organizacje-pozarzadowe"
  | "samorzad-lokalny"
  | "szkoly-i-placowki"
  | "osoby-bezrobotne"
  | "wolontariusze"

export type NeedTag =
  | "samotnosc"
  | "izolacja-seniorow"
  | "wykluczenie-cyfrowe"
  | "transport"
  | "mobilnosc"
  | "wsparcie-psychologiczne"
  | "zdrowie-psychiczne"
  | "aktywizacja-zawodowa"
  | "bezrobocie"
  | "kompetencje-cyfrowe"
  | "edukacja"
  | "wsparcie-rodzin"
  | "przemoc-domowa"
  | "bezdomnosc"
  | "mieszkalnictwo"
  | "integracja-migrantow"
  | "wolontariat"
  | "partycypacja"
  | "uslugi-spoleczne"
  | "opieka-dlugoterminowa"
  | "aktywnosc-fizyczna"
  | "kultura"
  | "ekologia"
  | "wsparcie-sasiedzkie"
  | "pomoc-zywnosciowa"
  | "wsparcie-dla-ukrainy"
  | "piecza-zastepcza"
  | "uzaleznienia"
  | "przedsiebiorczosc-spoleczna"
  | "dostępnosc"

export type SourceKind =
  | "dokumentacja-projektu"
  | "raport-ewaluacyjny"
  | "baza-innowacji"
  | "publikacja"

export interface SourceRef {
  id: string
  title: string
  organization: string
  year?: number
  url?: string
  kind: SourceKind
  note?: string
}

export interface ImplementationRequirement {
  label: string
  value: string | null
}

export type EvidenceLevel = "silne" | "umiarkowane" | "slabe" | "brak"

export interface Innovation {
  id: string
  title: string
  shortDescription: string
  fullDescription: string
  audiences: AudienceId[]
  tags: NeedTag[]
  location: {
    municipality?: string
    county?: string
    region?: string
  }
  organization: string
  years?: string
  evidenceLevel: EvidenceLevel
  facts: string[]
  aiSuggestions: string[]
  mechanism: string
  requirements: ImplementationRequirement[]
  costs: string | null
  timeline: string | null
  availableResources: string | null
  limitations: string[]
  firstSteps: string[]
  primarySource: SourceRef
  reportIds: string[]
  similarCaseIds: string[]
}

export interface DocumentedCase {
  id: string
  title: string
  description: string
  location: string
  organization: string
  tags: NeedTag[]
  result: string
  source: SourceRef
}

export interface SupportingReport {
  id: string
  title: string
  summary: string
  organization: string
  year: number
  tags: NeedTag[]
  url?: string
}

export interface NeedDraft {
  description: string
  whoNeedsSupport: string
  municipality: string
  county: string
  desiredOutcome: string
  availableResources: string
  budget: string
  timeframe: string
  accessibilityNeeds: string
}

export interface NeedLocation {
  municipality?: string
  county?: string
  region?: string
}

export interface NeedProfile {
  draft: NeedDraft
  tags: NeedTag[]
  audiences: AudienceId[]
  location: NeedLocation
  outcomeKeywords: string[]
  answers: Record<ClarifyingQuestionId, string>
}

export type ClarifyingQuestionId = "audience" | "location" | "outcome" | "resources"

export interface ClarifyingOption {
  value: string
  label: string
}

export interface ClarifyingQuestion {
  id: ClarifyingQuestionId
  question: string
  helpText: string
  options: ClarifyingOption[]
  allowOther: boolean
}

export type RelevanceLevel = "bardzo-trafne" | "trafne" | "mozliwe" | "slabe"

export interface Recommendation {
  innovation: Innovation
  relevance: RelevanceLevel
  matchScore: number
  whyItFits: string
  fitReasons: string[]
  caveats: string[]
  facts: string[]
  aiSuggestions: string[]
  primarySource: SourceRef
  reports: SupportingReport[]
  similarCases: DocumentedCase[]
}

export interface MatchResult {
  status: "ok" | "no-match"
  recommendations: Recommendation[]
  similarCases: DocumentedCase[]
  reports: SupportingReport[]
  notice?: "incomplete-evidence"
}

export interface AnalyzeResult {
  profile: NeedProfile
  questions: ClarifyingQuestion[]
}

export type ServiceScenario = "normal" | "failure" | "no-match" | "incomplete"
