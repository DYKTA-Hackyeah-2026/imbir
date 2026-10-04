export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const from = formatDate(start)
  const to = formatDate(end)
  if (from && to) return `${from} – ${to}`
  if (from) return `od ${from}`
  if (to) return `do ${to}`
  return null
}
