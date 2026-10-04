import { INNOVATIONS } from "../data/innovations"
import { SIMILAR_CASES } from "../data/similarCases"
import { SUPPORTING_REPORTS } from "../data/reports"
import { AUDIENCE_LABELS, EVIDENCE_LABELS, NEED_TAG_LABELS } from "../labels"
import type {
  DocumentedCase,
  Innovation,
  MatchResult,
  NeedProfile,
  Recommendation,
  RelevanceLevel,
  ServiceScenario,
  SupportingReport,
} from "../types"
import { normalize } from "./needAnalysis"

const MAX_RECOMMENDATIONS = 5

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function locationMatches(profile: NeedProfile, innovation: Innovation): boolean {
  const genericLocations = ["cala malopolska", "malopolska"]
  const userValues = [profile.location.municipality, profile.location.county]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalize(value))
    .filter((value) => value.length > 0 && !genericLocations.includes(value))
  if (userValues.length === 0) return false

  const innovationValues = [
    innovation.location.municipality,
    innovation.location.county,
    innovation.location.region,
  ].filter((value): value is string => Boolean(value))

  return userValues.some((needle) =>
    innovationValues.some((innovationValue) => {
      const haystack = normalize(innovationValue)
      return haystack.includes(needle) || needle.includes(haystack)
    })
  )
}

function relevanceFromScore(score: number): RelevanceLevel {
  if (score >= 12) return "bardzo-trafne"
  if (score >= 7) return "trafne"
  if (score >= 4) return "mozliwe"
  return "slabe"
}

function buildWhyItFits(
  matchedTags: string[],
  matchedAudiences: string[],
  location: boolean
): string {
  const parts: string[] = []
  if (matchedTags.length > 0) {
    parts.push(`Opisana potrzeba dotyczy podobnych obszarów: ${matchedTags.join(", ")}.`)
  }
  if (matchedAudiences.length > 0) {
    parts.push(`Rozwiązanie jest kierowane między innymi do grupy z Twojego opisu: ${matchedAudiences.join(", ")}.`)
  }
  if (location) {
    parts.push("Innowacja była już stosowana w zbliżonej lokalizacji w Małopolsce.")
  }
  if (parts.length === 0) {
    parts.push(
      "Na podstawie opisu trudno wskazać jednoznaczne podobieństwo. To dopasowanie ma charakter orientacyjny i wymaga weryfikacji."
    )
  }
  parts.push("Poniższe uzasadnienie zostało przygotowane automatycznie i nie jest faktem ze źródła.")
  return parts.join(" ")
}

function buildFitReasons(
  innovation: Innovation,
  matchedTags: string[],
  matchedAudiences: string[],
  location: boolean
): string[] {
  const reasons: string[] = []
  if (matchedTags.length > 0) {
    reasons.push(`Zgodne obszary potrzeby: ${matchedTags.join(", ")}.`)
  }
  if (matchedAudiences.length > 0) {
    reasons.push(`Zgodna grupa docelowa: ${matchedAudiences.join(", ")}.`)
  }
  if (location) {
    const locationLabel =
      [innovation.location.municipality, innovation.location.county]
        .filter(Boolean)
        .join(", ") || "Brak danych"
    reasons.push(`Lokalizacja: ${locationLabel}.`)
  }
  reasons.push(`Podstawa źródłowa: ${EVIDENCE_LABELS[innovation.evidenceLevel]}.`)
  return reasons
}

function buildCaveats(innovation: Innovation): string[] {
  const caveats = [...innovation.limitations]
  if (innovation.evidenceLevel === "slabe" || innovation.evidenceLevel === "brak") {
    caveats.push(
      "Dostępne dane źródłowe są ograniczone. Przed decyzją zalecamy kontakt z realizatorem i weryfikację efektów."
    )
  }
  return caveats
}

function toRecommendation(profile: NeedProfile, innovation: Innovation): Recommendation | null {
  const matchedTags = unique(innovation.tags.filter((tag) => profile.tags.includes(tag)))
  const matchedAudiences = unique(
    innovation.audiences.filter((audience) => profile.audiences.includes(audience))
  )
  const location = locationMatches(profile, innovation)

  if (matchedTags.length === 0 && matchedAudiences.length === 0) return null

  let score = matchedTags.length * 3 + matchedAudiences.length * 2
  if (location) score += 2
  if (profile.outcomeKeywords.length > 0) {
    score += 1
  }

  const tagLabels = matchedTags.map((tag) => NEED_TAG_LABELS[tag])
  const audienceLabels = matchedAudiences.map((audience) => AUDIENCE_LABELS[audience])

  return {
    innovation,
    relevance: relevanceFromScore(score),
    matchScore: score,
    whyItFits: buildWhyItFits(tagLabels, audienceLabels, location),
    fitReasons: buildFitReasons(innovation, tagLabels, audienceLabels, location),
    caveats: buildCaveats(innovation),
    facts: innovation.facts,
    aiSuggestions: innovation.aiSuggestions,
    primarySource: innovation.primarySource,
    reports: innovation.reportIds
      .map((id) => SUPPORTING_REPORTS.find((report) => report.id === id))
      .filter((report): report is SupportingReport => Boolean(report)),
    similarCases: innovation.similarCaseIds
      .map((id) => SIMILAR_CASES.find((item) => item.id === id))
      .filter((item): item is DocumentedCase => Boolean(item)),
  }
}

const EVIDENCE_RANK: Record<Innovation["evidenceLevel"], number> = {
  silne: 4,
  umiarkowane: 3,
  slabe: 2,
  brak: 1,
}

export function matchInnovations(
  profile: NeedProfile,
  scenario: ServiceScenario = "normal"
): MatchResult {
  if (scenario === "no-match" || (profile.tags.length === 0 && profile.audiences.length === 0)) {
    return {
      status: "no-match",
      recommendations: [],
      similarCases: [],
      reports: [],
      notice: scenario === "incomplete" ? "incomplete-evidence" : undefined,
    }
  }

  let recommendations = INNOVATIONS.map((innovation) => toRecommendation(profile, innovation))
    .filter((item): item is Recommendation => item !== null)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
      return EVIDENCE_RANK[b.innovation.evidenceLevel] - EVIDENCE_RANK[a.innovation.evidenceLevel]
    })

  if (scenario === "incomplete") {
    recommendations = recommendations.filter(
      (item) => item.innovation.evidenceLevel === "slabe" || item.innovation.evidenceLevel === "brak"
    )
  }

  recommendations = recommendations.slice(0, MAX_RECOMMENDATIONS)

  if (recommendations.length === 0) {
    return {
      status: "no-match",
      recommendations: [],
      similarCases: [],
      reports: [],
      notice: scenario === "incomplete" ? "incomplete-evidence" : undefined,
    }
  }

  const similarCases = unique(
    recommendations.flatMap((item) => item.similarCases)
  )
  const reports = unique(recommendations.flatMap((item) => item.reports))

  const hasWeakEvidence = recommendations.some(
    (item) => item.innovation.evidenceLevel === "slabe" || item.innovation.evidenceLevel === "brak"
  )

  return {
    status: "ok",
    recommendations,
    similarCases: similarCases.slice(0, 4),
    reports: reports.slice(0, 4),
    notice: scenario === "incomplete" || hasWeakEvidence ? "incomplete-evidence" : undefined,
  }
}

export function requestRecommendations(
  profile: NeedProfile,
  scenario: ServiceScenario = "normal"
): Promise<MatchResult> {
  return new Promise((resolve, reject) => {
    const delay = scenario === "failure" ? 900 : 1400
    window.setTimeout(() => {
      if (scenario === "failure") {
        reject(new Error("Usługa dopasowania jest chwilowo niedostępna."))
        return
      }
      resolve(matchInnovations(profile, scenario))
    }, delay)
  })
}
