import { Badge } from "@/components/ui/badge"
import { EVIDENCE_LABELS, EVIDENCE_TONE, RELEVANCE_LABELS } from "../labels"
import type { EvidenceLevel, RelevanceLevel } from "../types"

export function RelevanceBadge({ relevance }: { relevance: RelevanceLevel }) {
  const config = RELEVANCE_LABELS[relevance]
  return <Badge variant={config.tone}>{config.label}</Badge>
}

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <Badge variant={EVIDENCE_TONE[level]}>{EVIDENCE_LABELS[level]}</Badge>
}

export function AiBadge({ children = "Sugestia AI" }: { children?: string }) {
  return <Badge variant="ai">{children}</Badge>
}

export function FactBadge({ children = "Fakt ze źródła" }: { children?: string }) {
  return <Badge variant="fact">{children}</Badge>
}
