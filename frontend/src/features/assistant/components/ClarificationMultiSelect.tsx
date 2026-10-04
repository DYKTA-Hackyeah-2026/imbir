import { cn } from "@/lib/utils"

import type { ClarificationOption } from "../types"

export function ClarificationMultiSelect({
  options,
  values,
  onToggle,
  disabled = false,
}: {
  options: ClarificationOption[]
  values: string[]
  onToggle: (id: string) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="space-y-2.5">
      <legend className="sr-only">Wybierz jedną lub więcej odpowiedzi</legend>
      {options.map((option) => {
        const selected = values.includes(option.id)
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
              type="checkbox"
              value={option.id}
              checked={selected}
              onChange={() => onToggle(option.id)}
              className="accent-primary size-5 shrink-0 rounded"
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
