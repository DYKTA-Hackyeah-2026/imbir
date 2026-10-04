import type { ReactNode } from "react"
import { AlertCircle, Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import type { CreatorStep } from "../types"

export function SectionCard({
  step,
  title,
  subtitle,
  expanded,
  completed,
  hasErrors,
  onToggle,
  children,
}: {
  step: CreatorStep
  title: string
  subtitle: string
  expanded: boolean
  completed: boolean
  hasErrors: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const panelId = `creator-step-panel-${step}`
  const headerId = `creator-step-header-${step}`

  return (
    <section
      aria-labelledby={headerId}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow dark:bg-neutral-900",
        expanded
          ? "border-blue-200 shadow-md dark:border-blue-900/60"
          : "border-slate-200/80 dark:border-neutral-800",
        hasErrors && !expanded ? "border-rose-300 dark:border-rose-900/70" : null,
      )}
    >
      <h2>
        <button
          type="button"
          id={headerId}
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-bold text-white",
              hasErrors
                ? "bg-rose-500"
                : completed
                  ? "bg-emerald-600"
                  : "bg-blue-600",
            )}
          >
            {completed && !hasErrors ? <Check className="size-5" /> : step}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">{title}</span>
            <span className="mt-0.5 block text-sm text-slate-500 dark:text-neutral-400">
              {subtitle}
            </span>
          </span>
          {hasErrors ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              Uzupełnij
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-slate-400 transition-transform",
              expanded ? "rotate-180" : null,
            )}
          />
        </button>
      </h2>

      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="space-y-6 border-t border-slate-100 px-5 py-6 dark:border-neutral-800"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}
