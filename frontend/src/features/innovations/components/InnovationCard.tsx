import { Link } from "react-router-dom"
import { ArrowRight, Coins, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { InnovationSummary } from "@/lib/innovations"

const EVIDENCE_LABELS: Record<
  InnovationSummary["evidenceStatus"],
  { label: string; variant: "strong" | "ok" | "ai" }
> = {
  documented: { label: "Udokumentowana", variant: "strong" },
  partially_documented: { label: "Częściowo udokumentowana", variant: "ok" },
  synthetic: { label: "Rekord demonstracyjny", variant: "ai" },
}

export function tagLabel(tag: string): string {
  const words = tag.replace(/_/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function InnovationCard({ innovation }: { innovation: InnovationSummary }) {
  const evidence = EVIDENCE_LABELS[innovation.evidenceStatus]

  return (
    <Link
      to={`/innowacja/${encodeURIComponent(innovation.innovationId)}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg leading-snug font-bold group-hover:text-blue-700 dark:group-hover:text-blue-300">
          {innovation.title}
        </h2>
        <Badge variant={evidence.variant}>{evidence.label}</Badge>
      </div>

      <p className="line-clamp-3 text-sm text-slate-600 dark:text-neutral-400">
        {innovation.summary}
      </p>

      {innovation.problemTags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {innovation.problemTags.slice(0, 4).map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {tagLabel(tag)}
            </li>
          ))}
        </ul>
      ) : null}

      <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-neutral-400">
        <li className="inline-flex items-center gap-1.5">
          <Coins aria-hidden="true" className="size-4 shrink-0" />
          {innovation.estimatedCostPln === null
            ? "koszt nieokreślony"
            : `${innovation.estimatedCostPln.toLocaleString("pl-PL")} zł`}
        </li>
        {innovation.timeframeWeeks !== null ? (
          <li className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            {innovation.timeframeWeeks} tyg.
          </li>
        ) : null}
      </ul>

      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
        Zobacz innowację i testy
        <ArrowRight
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}
