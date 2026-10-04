import { useId } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { TEXT_LIMIT } from "../types"

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
      {message}
    </p>
  )
}

export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-rose-600 dark:text-rose-400">
      *
    </span>
  )
}

export function CountedTextarea({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  placeholder,
  error,
  help,
  limit = TEXT_LIMIT,
  rows,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
  placeholder?: string
  error?: string
  help?: string
  limit?: number
  rows?: number
}) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const helpId = help ? `${fieldId}-help` : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-base">
        {label} {required ? <RequiredMark /> : null}
      </Label>
      {help ? (
        <p id={helpId} className="text-sm text-slate-500 dark:text-neutral-400">
          {help}
        </p>
      ) : null}
      <Textarea
        id={fieldId}
        value={value}
        rows={rows}
        maxLength={limit}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={helpId}
      />
      <div className="flex items-center justify-between gap-3">
        <FieldError message={error} />
        <span
          aria-hidden="true"
          className={cn(
            "ml-auto text-xs tabular-nums",
            value.length >= limit
              ? "font-semibold text-rose-600 dark:text-rose-400"
              : "text-slate-400 dark:text-neutral-500",
          )}
        >
          {value.length}/{limit}
        </span>
      </div>
    </div>
  )
}

export function TextField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
  error,
  help,
  type = "text",
  inputMode,
}: {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  error?: string
  help?: string
  type?: string
  inputMode?: "text" | "numeric" | "decimal"
}) {
  const generatedId = useId()
  const fieldId = id ?? generatedId

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-base">
        {label} {required ? <RequiredMark /> : null}
      </Label>
      <Input
        id={fieldId}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10"
        aria-required={required ? true : undefined}
        aria-invalid={error ? true : undefined}
      />
      {help && !error ? (
        <p className="text-sm text-slate-500 dark:text-neutral-400">{help}</p>
      ) : null}
      <FieldError message={error} />
    </div>
  )
}
