import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NEED_TAG_LABELS } from "../labels"
import type { DocumentedCase, SupportingReport } from "../types"
import { ReportBlock, SourceBlock } from "./SourceBlock"

export function DocumentedCasesList({
  cases,
  heading = "Podobne udokumentowane przypadki",
}: {
  cases: DocumentedCase[]
  heading?: string
}) {
  if (cases.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">{heading}</CardTitle>
        <p className="text-sm text-muted-foreground">
          To opisane w źródłach wdrożenia, a nie propozycje dopasowane automatycznie.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cases.map((item) => (
          <div key={item.id} className="rounded-lg border border-border p-4">
            <h3 className="font-medium text-foreground">{item.title}</h3>
            <p className="text-sm text-muted-foreground">
              {item.location} • {item.organization}
            </p>
            <p className="mt-2">{item.description}</p>
            <p className="mt-2 text-sm">
              <span className="font-medium">Udokumentowany rezultat: </span>
              {item.result}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {NEED_TAG_LABELS[tag]}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <SourceBlock source={item.source} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function SupportingReportsList({
  reports,
  heading = "Raporty i opracowania wspierające",
}: {
  reports: SupportingReport[]
  heading?: string
}) {
  if (reports.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2" className="text-lg">{heading}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Materiały pomocnicze do dalszej analizy. Nie są to rekomendacje dopasowane do opisu.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {reports.map((report) => (
          <ReportBlock key={report.id} report={report} />
        ))}
      </CardContent>
    </Card>
  )
}
