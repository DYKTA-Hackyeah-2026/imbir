import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { STEPS, type CreatorStep } from "../types"

export function Stepper({
  current,
  completed,
  onSelect,
}: {
  current: CreatorStep
  completed: Set<CreatorStep>
  onSelect: (step: CreatorStep) => void
}) {
  return (
    <nav aria-label="Kroki formularza">
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute top-4.5 right-[6%] left-[6%] hidden h-0.5 bg-slate-200 sm:block dark:bg-neutral-800"
        />
        <ol className="relative flex list-none items-start justify-between gap-1 overflow-x-auto">
          {STEPS.map((meta) => {
            const isCurrent = meta.step === current
            const isDone = completed.has(meta.step)
            return (
              <li key={meta.step} className="flex min-w-24 flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => onSelect(meta.step)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Krok ${meta.step}: ${meta.title}`}
                  className="group flex w-full max-w-40 cursor-pointer flex-col items-center gap-2 rounded-lg px-1 py-1 text-center focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                      isCurrent || isDone
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white text-slate-600 group-hover:border-blue-400 group-hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300",
                    )}
                  >
                    {isDone && !isCurrent ? <Check className="size-4" /> : meta.step}
                  </span>
                  <span
                    className={cn(
                      "text-[0.7rem] leading-tight sm:text-xs",
                      isCurrent
                        ? "font-bold text-blue-700 dark:text-blue-300"
                        : "font-medium text-slate-600 dark:text-neutral-400",
                    )}
                  >
                    {meta.title}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
