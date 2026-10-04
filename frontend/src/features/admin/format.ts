export function formatDate(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatShortDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })
}

export function formatRelative(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (minutes < 1) return "przed chwilą"
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz. temu`
  const days = Math.floor(hours / 24)
  if (days === 1) return "wczoraj"
  if (days < 7) return `${days} dni temu`
  return formatDate(value)
}

const STATUS_LABELS: Record<string, string> = {
  new: "nowe",
  in_review: "w analizie",
  planned: "zaplanowane",
  resolved: "rozwiązane",
  rejected: "odrzucone",
  draft: "szkic",
  completed: "ukończone",
  submitted: "zgłoszone",
  approved: "zatwierdzone",
  pending: "oczekuje",
  accepted: "zaakceptowane",
  recruiting: "nabór otwarty",
  active: "w trakcie",
}

export function formatStatus(value: string): string {
  return STATUS_LABELS[value] ?? value
}
