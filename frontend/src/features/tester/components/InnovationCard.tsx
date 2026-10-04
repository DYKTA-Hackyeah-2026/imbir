import { FlaskConical, MapPin, Users } from "lucide-react"

import type { CatalogueEvidenceStatus, CatalogueSummary } from "@/lib/tester"
import { cn } from "@/lib/utils"

const EVIDENCE: Record<
  CatalogueEvidenceStatus,
  { label: string; className: string }
> = {
  documented: {
    label: "Udokumentowane",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  partially_documented: {
    label: "Częściowo udokumentowane",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  synthetic: {
    label: "Rekord demonstracyjny",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
}

function evidenceFor(innovation: CatalogueSummary) {
  const key =
    innovation.evidenceStatus ??
    (innovation.synthetic ? "synthetic" : "partially_documented")
  return EVIDENCE[key] ?? EVIDENCE.partially_documented
}

export function InnovationCard({ innovation }: { innovation: CatalogueSummary }) {
  const evidence = evidenceFor(innovation)

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <FlaskConical aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="leading-snug font-semibold">{innovation.title}</h3>
          <span
            className={cn(
              "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
              evidence.className,
            )}
          >
            {evidence.label}
          </span>
        </div>
      </div>

      {innovation.summary ? (
        <p className="line-clamp-3 text-sm text-slate-600 dark:text-neutral-400">
          {innovation.summary}
        </p>
      ) : null}

      {innovation.targetGroups && innovation.targetGroups.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {innovation.targetGroups.slice(0, 3).map((group) => (
            <span
              key={group}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              {group}
            </span>
          ))}
        </div>
      ) : null}

      <div className="text-muted-foreground mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
        {innovation.testedIn && innovation.testedIn.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
            {innovation.testedIn.join(", ")}
          </span>
        ) : null}
        {innovation.applicableContexts &&
        innovation.applicableContexts.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-3.5 shrink-0" />
            {innovation.applicableContexts.slice(0, 4).join(", ")}
          </span>
        ) : null}
      </div>
    </article>
  )
}
