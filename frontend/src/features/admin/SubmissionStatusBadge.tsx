import { Badge } from "@/components/ui/badge"
import type { AdminSubmission } from "@/lib/admin"

type BadgeVariant = "default" | "secondary" | "outline" | "strong" | "good" | "ok" | "weak"

function meta(submission: Pick<AdminSubmission, "status" | "isAccepted">): {
  label: string
  variant: BadgeVariant
} {
  if (submission.status === "approved" || submission.isAccepted) {
    return { label: "Zatwierdzone", variant: "strong" }
  }
  if (submission.status === "rejected") {
    return { label: "Odrzucone", variant: "outline" }
  }
  if (submission.status === "submitted") {
    return { label: "Oczekuje", variant: "ok" }
  }
  return { label: "Nowe", variant: "good" }
}

export function SubmissionStatusBadge({
  submission,
}: {
  submission: Pick<AdminSubmission, "status" | "isAccepted">
}) {
  const value = meta(submission)
  return <Badge variant={value.variant}>{value.label}</Badge>
}
