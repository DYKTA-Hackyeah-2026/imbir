import { AlertCircle, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AssistantError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/10 text-destructive flex flex-col items-center gap-3 rounded-xl border px-4 py-6 text-center text-sm"
    >
      <AlertCircle aria-hidden="true" className="size-5" />
      <p className="max-w-md">{message}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Spróbuj ponownie
        </Button>
      ) : null}
    </div>
  )
}
