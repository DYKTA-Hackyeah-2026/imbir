import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Info, Sparkles } from "lucide-react"
import { AUDIENCE_LABELS } from "../labels"
import type { Recommendation } from "../types"
import { AiBadge, EvidenceBadge, FactBadge, RelevanceBadge } from "./Badges"
import { DataValue } from "./DataValue"
import { FeedbackForm, type FeedbackValue } from "./FeedbackForm"
import { DocumentedCasesList } from "./SimilarCases"
import { ReportBlock, SourceBlock } from "./SourceBlock"

type RecommendationDetailProps = {
  recommendation: Recommendation
  onBack: () => void
  feedback: FeedbackValue | undefined
  onFeedback: (value: FeedbackValue) => void
}

export function RecommendationDetail({
  recommendation,
  onBack,
  feedback,
  onFeedback,
}: RecommendationDetailProps) {
  const { innovation } = recommendation

  return (
    <article className="space-y-6">
      <Button type="button" variant="ghost" size="lg" onClick={onBack} className="-ml-2">
        <ArrowLeft aria-hidden="true" />
        Wróć do listy rekomendacji
      </Button>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <RelevanceBadge relevance={recommendation.relevance} />
          <EvidenceBadge level={innovation.evidenceLevel} />
        </div>
        <h1 id="step-heading" tabIndex={-1} className="text-2xl font-bold md:text-3xl">
          {innovation.title}
        </h1>
        <p className="text-lg text-muted-foreground">{innovation.shortDescription}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{innovation.organization}</span>
          {" • "}
          <span>
            {[innovation.location.municipality, innovation.location.county]
              .filter(Boolean)
              .join(", ") || "Brak danych"}
          </span>
          {innovation.years ? ` • ${innovation.years}` : ""}
        </p>
      </header>

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Co pochodzi od AI, a co ze źródeł</AlertTitle>
        <AlertDescription>
          Dopasowanie, etykieta trafności oraz sekcja „Dlaczego pasuje” powstały
          automatycznie. Fakty oznaczone jako źródłowe pochodzą z dokumentów wymienionych
          w materiałach źródłowych. Przed decyzją zweryfikuj informacje u realizatora.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Dlaczego pasuje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p>{recommendation.whyItFits}</p>
          <ul className="space-y-1.5 text-sm">
            {recommendation.fitReasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden="true" className="text-primary">
                  •
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Co robi ta innowacja</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{innovation.fullDescription}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Kto jest wspierany</CardTitle>
          </CardHeader>
          <CardContent>
            {innovation.audiences.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {innovation.audiences.map((audience) => (
                  <li
                    key={audience}
                    className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {AUDIENCE_LABELS[audience]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Brak danych</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Jak działa rozwiązanie</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{innovation.mechanism}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Wymagania wdrożeniowe</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            {innovation.requirements.map((requirement) => (
              <div key={requirement.label} className="rounded-lg border border-border p-3">
                <dt className="text-sm font-medium text-muted-foreground">
                  {requirement.label}
                </dt>
                <dd className="mt-0.5">
                  <DataValue value={requirement.value} />
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Koszty, czas i dostępne zasoby</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-sm font-medium text-muted-foreground">Koszty</dt>
              <dd className="mt-0.5">
                <DataValue value={innovation.costs} />
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-sm font-medium text-muted-foreground">Czas</dt>
              <dd className="mt-0.5">
                <DataValue value={innovation.timeline} />
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-sm font-medium text-muted-foreground">Dostępne zasoby</dt>
              <dd className="mt-0.5">
                <DataValue value={innovation.availableResources} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Ograniczenia i niepewności</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recommendation.caveats.map((caveat) => (
              <li key={caveat} className="flex gap-2">
                <span aria-hidden="true" className="text-amber-700">
                  !
                </span>
                <span>{caveat}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Fakty ze źródeł</CardTitle>
            <FactBadge />
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendation.facts.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span aria-hidden="true" className="text-teal-700">
                    ✓
                  </span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Sugestie wygenerowane przez AI</CardTitle>
            <div className="flex items-center gap-2">
              <AiBadge />
              <Sparkles aria-hidden="true" className="size-4 text-violet-700" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendation.aiSuggestions.map((suggestion) => (
                <li key={suggestion} className="flex gap-2">
                  <span aria-hidden="true" className="text-violet-700">
                    ✦
                  </span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              Te propozycje nie są potwierdzone źródłowo. Wymagają weryfikacji i zgody
              odpowiedzialnych osób.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Sugerowane pierwsze kroki</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="ml-5 list-decimal space-y-2">
            {innovation.firstSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Materiały źródłowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Źródło podstawowe rekomendacji
            </h3>
            <SourceBlock source={recommendation.primarySource} />
          </div>
          {recommendation.reports.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                Raporty wspierające
              </h3>
              <div className="grid gap-3">
                {recommendation.reports.map((report) => (
                  <ReportBlock key={report.id} report={report} />
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <DocumentedCasesList cases={recommendation.similarCases} />

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Oceń tę rekomendację</CardTitle>
          <p className="text-sm text-muted-foreground">
            Twoja opinia jest opcjonalna i pomaga poprawić jakość dopasowań.
          </p>
        </CardHeader>
        <CardContent>
          <FeedbackForm
            idPrefix={`feedback-${innovation.id}`}
            value={feedback}
            onSubmit={onFeedback}
          />
        </CardContent>
      </Card>
    </article>
  )
}
