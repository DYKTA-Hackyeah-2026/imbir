import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2 } from "lucide-react"

export type FeedbackAnswer = "tak" | "nie" | "nie-wiem"

export type FeedbackValue = {
  useful: FeedbackAnswer | null
  reason: string
  submitted: boolean
}

export type FeedbackFormProps = {
  idPrefix: string
  value: FeedbackValue | undefined
  onSubmit: (value: FeedbackValue) => void
}

const QUICK_REASONS = [
  "Nieodpowiednia grupa docelowa",
  "Wymagania wdrożeniowe przekraczają dostępne zasoby",
  "Brak wystarczających danych źródłowych",
  "Rozwiązanie nie pasuje do naszej lokalizacji",
]

export function FeedbackForm({ idPrefix, value, onSubmit }: FeedbackFormProps) {
  const [useful, setUseful] = useState<FeedbackAnswer | null>(value?.useful ?? null)
  const [reason, setReason] = useState(value?.reason ?? "")
  const [submitted, setSubmitted] = useState(value?.submitted ?? false)

  if (submitted) {
    return (
      <div
        className="flex items-start gap-3 rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-4"
        role="status"
      >
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 text-emerald-700" />
        <div>
          <p className="font-medium text-foreground">Dziękujemy za opinię.</p>
          <p className="text-sm text-muted-foreground">
            Twoja odpowiedź pomaga nam poprawić trafność przyszłych dopasowań.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!useful) return
        const next = { useful, reason: reason.trim(), submitted: true }
        setSubmitted(true)
        onSubmit(next)
      }}
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          Czy ta rekomendacja jest dla Ciebie przydatna?
        </legend>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "tak" as const, label: "Tak, przydatna" },
            { value: "nie" as const, label: "Nie, nie jest przydatna" },
            { value: "nie-wiem" as const, label: "Trudno powiedzieć" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/5 hover:bg-muted/60"
            >
              <input
                type="radio"
                name={`${idPrefix}-feedback`}
                value={option.value}
                checked={useful === option.value}
                onChange={() => setUseful(option.value)}
                className="size-4 accent-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {useful === "nie" ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Propozycje powodów">
          {QUICK_REASONS.map((quick) => (
            <Button
              key={quick}
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setReason((current) =>
                  current.includes(quick) ? current : current ? `${current}; ${quick}` : quick
                )
              }
            >
              {quick}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-reason`}>
          Krótki powód (opcjonalnie)
        </Label>
        <Textarea
          id={`${idPrefix}-reason`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Np. nieodpowiednia grupa docelowa albo wymagania przekraczające nasze zasoby."
          aria-describedby={`${idPrefix}-reason-help`}
        />
        <p id={`${idPrefix}-reason-help`} className="text-sm text-muted-foreground">
          Nie wpisuj danych osobowych ani informacji wrażliwych.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={!useful}>
        Wyślij opinię
      </Button>
    </form>
  )
}
