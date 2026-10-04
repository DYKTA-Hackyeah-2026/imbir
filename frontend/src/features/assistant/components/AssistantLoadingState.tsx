import { Loader2 } from "lucide-react"

export function AssistantLoadingState({
  label = "Wczytujemy propozycje…",
}: {
  label?: string
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center justify-center gap-2 py-3 text-sm"
    >
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </p>
  )
}
