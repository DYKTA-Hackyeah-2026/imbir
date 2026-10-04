import { ExternalLink } from "lucide-react"
import { SOURCE_KIND_LABELS } from "../labels"
import type { SourceRef, SupportingReport } from "../types"

export function SourceBlock({ source }: { source: SourceRef }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="font-medium text-foreground">{source.title}</p>
      <p className="text-sm text-muted-foreground">
        {source.organization}
        {source.year ? ` • ${source.year}` : ""} • {SOURCE_KIND_LABELS[source.kind]}
      </p>
      {source.note ? <p className="mt-1 text-sm text-muted-foreground">{source.note}</p> : null}
      {source.url ? (
        <a
          href={source.url}
          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Otwórz źródło
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      ) : null}
    </div>
  )
}

export function ReportBlock({ report }: { report: SupportingReport }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="font-medium text-foreground">{report.title}</p>
      <p className="text-sm text-muted-foreground">
        {report.organization} • {report.year}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{report.summary}</p>
    </div>
  )
}
