import { cn } from "@/lib/utils"

import type { ClarificationOption } from "../types"

export function ClarificationSingleSelect({
  options,
  name,
  value,
  onChange,
  disabled = false,
}: {
  options: ClarificationOption[]
  name: string
  value: string | null
  onChange: (id: string) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2.5">
      <legend className="sr-only">Wybierz jedną odpowiedź</legend>
      {options.map((option) => {
        const selected = value === option.id
        return (
          <label
            key={option.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 text-base transition-colors focus-within:ring-3 focus-within:ring-ring/40",
              selected
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:border-primary/40",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={selected}
              onChange={() => onChange(option.id)}
              className="accent-primary size-5 shrink-0"
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
