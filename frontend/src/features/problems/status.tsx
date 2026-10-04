import { Badge } from "@/components/ui/badge"
import type { ProblemReporterType, ProblemReportStatus } from "@/lib/problemReports"

type BadgeVariant = "default" | "secondary" | "outline" | "strong" | "good" | "ok" | "weak" | "ai"

export const PROBLEM_STATUS_META: Record<
  ProblemReportStatus,
  { label: string; variant: BadgeVariant }
> = {
  new: { label: "Nowe", variant: "good" },
  in_review: { label: "W analizie", variant: "ok" },
  planned: { label: "Zaplanowane do działań", variant: "ai" },
  resolved: { label: "Rozwiązane", variant: "strong" },
  rejected: { label: "Odrzucone", variant: "outline" },
}

export const REPORTER_LABELS: Record<ProblemReporterType, string> = {
  resident: "Mieszkaniec",
  ngo: "Organizacja pozarządowa",
  local_government: "Samorząd / JST",
  institution: "Instytucja",
  other: "Inny zgłaszający",
}

export function ProblemStatusBadge({ status }: { status: ProblemReportStatus }) {
  const meta = PROBLEM_STATUS_META[status] ?? PROBLEM_STATUS_META.new
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
