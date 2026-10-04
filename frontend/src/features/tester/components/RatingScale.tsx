import { useId } from "react"
import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

export function Stars({
  value,
  className,
  size = "size-5",
}: {
  value: number
  className?: string
  size?: string
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`Ocena ${value} na 5`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(
            size,
            star <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300 dark:text-neutral-700",
          )}
        />
      ))}
    </span>
  )
}

const RATING_LABELS = [
  "",
  "zdecydowanie źle",
  "słabo",
  "przeciętnie",
  "dobrze",
  "bardzo dobrze",
]

export function RatingScale({
  legend,
  hint,
  name,
  value,
  onChange,
  error,
  required,
}: {
  legend: string
  hint?: string
  name: string
  value: number | null
  onChange: (value: number) => void
  error?: string
  required?: boolean
}) {
  const groupId = useId()

  return (
    <fieldset aria-invalid={error ? true : undefined} aria-describedby={[hint ? `${groupId}-hint` : undefined, error ? `${groupId}-error` : undefined].filter(Boolean).join(" ") || undefined}>
      <legend className="text-base font-medium">
        {legend}{" "}
        {required ? (
          <span aria-hidden="true" className="text-rose-600 dark:text-rose-400">
            *
          </span>
        ) : null}
      </legend>
      {hint ? (
        <p id={`${groupId}-hint`} className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          {hint}
        </p>
      ) : null}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={legend}>
          {[1, 2, 3, 4, 5].map((rating) => {
            const selected = value === rating
            return (
              <label
                key={rating}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2",
                  selected
                    ? "border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40"
                    : "border-slate-200 bg-white hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900",
                )}
              >
                <input
                  type="radio"
                  required={required}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${groupId}-error` : undefined}
                  name={name}
                  value={rating}
                  checked={selected}
                  onChange={() => onChange(rating)}
                  aria-label={`${rating} z 5 – ${RATING_LABELS[rating]}`}
                  className="sr-only"
                />
                <Star
                  aria-hidden="true"
                  className={cn(
                    "size-6",
                    selected
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-300 dark:text-neutral-700",
                  )}
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300">
                  {rating}
                </span>
              </label>
            )
          })}
        </div>
      </div>
      {error ? (
        <p id={`${groupId}-error`} role="alert" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
