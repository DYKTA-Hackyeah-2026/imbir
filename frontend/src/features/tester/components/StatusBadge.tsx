import { Badge } from "@/components/ui/badge"
import type { TestApplicationStatus, TestStatus } from "@/lib/tester"

type BadgeVariant = "default" | "secondary" | "outline" | "strong" | "good" | "ok" | "weak"

const TEST_STATUS: Record<TestStatus, { label: string; variant: BadgeVariant }> = {
  recruiting: { label: "Nabór otwarty", variant: "strong" },
  active: { label: "Test w trakcie", variant: "good" },
  completed: { label: "Test zakończony", variant: "weak" },
  cancelled: { label: "Test anulowany", variant: "outline" },
}

const APPLICATION_STATUS: Record<
  TestApplicationStatus,
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: "Oczekuje na decyzję", variant: "ok" },
  accepted: { label: "Zaakceptowane", variant: "strong" },
  rejected: { label: "Odrzucone", variant: "outline" },
  withdrawn: { label: "Wycofane", variant: "weak" },
  completed: { label: "Ukończone", variant: "good" },
}

export function TestStatusBadge({ status }: { status: TestStatus }) {
  const meta = TEST_STATUS[status] ?? TEST_STATUS.recruiting
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function ApplicationStatusBadge({ status }: { status: TestApplicationStatus }) {
  const meta = APPLICATION_STATUS[status] ?? APPLICATION_STATUS.pending
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}
