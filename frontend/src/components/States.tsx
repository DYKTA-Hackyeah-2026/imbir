import { AlertCircle, Inbox, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

export function LoadingState({ label = "Wczytywanie…" }: { label?: string }) {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive flex flex-col items-center gap-3 rounded-xl border px-4 py-8 text-center text-sm"
    >
      <AlertCircle aria-hidden="true" className="size-5" />
      <p>{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyState({ message = "Brak materiałów." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
      <Inbox aria-hidden="true" className="size-6" />
      <p>{message}</p>
    </div>
  )
}
