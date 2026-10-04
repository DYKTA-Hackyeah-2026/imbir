import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Info, RefreshCw, TriangleAlert } from "lucide-react"
import type { MatchResult, Recommendation } from "../types"
import { RecommendationCard } from "./RecommendationCard"
import { DocumentedCasesList, SupportingReportsList } from "./SimilarCases"

function pluralSolutions(count: number): string {
  if (count === 1) return "1 rozwiązanie"
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} rozwiązania`
  }
  return `${count} rozwiązań`
}

export function ResultsView({
  result,
  onOpen,
  onRestart,
}: {
  result: MatchResult
  onOpen: (recommendation: Recommendation) => void
  onRestart: () => void
}) {
  const count = result.recommendations.length

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Znaleźliśmy {pluralSolutions(count)} dla Twojej potrzeby
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Poniżej propozycje istniejących innowacji społecznych. Etykiety opisują, jak
          bliskie jest dopasowanie do opisu — nie są to procenty sukcesu.
        </p>
      </header>

      <Alert variant="info">
        <Info aria-hidden="true" />
        <AlertTitle>Jak czytać te propozycje</AlertTitle>
        <AlertDescription>
          Kolejność i etykiety trafności są wynikiem automatycznej analizy opisu. Każda
          propozycja zawiera informacje ze źródeł oraz sugestie AI, które są wyraźnie
          oznaczone. Przed decyzją sprawdź szczegóły i źródła.
        </AlertDescription>
      </Alert>

      {result.notice === "incomplete-evidence" ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Dla części rozwiązań dane źródłowe są niepełne</AlertTitle>
          <AlertDescription>
            Niektóre propozycje mają słabsze lub niepełne podstawy źródłowe. Takie
            informacje oznaczamy w szczegółach. Warto zweryfikować je u realizatora.
          </AlertDescription>
        </Alert>
      ) : null}

      <ul className="grid gap-5 md:grid-cols-2">
        {result.recommendations.map((recommendation, index) => (
          <li key={recommendation.innovation.id}>
            <RecommendationCard
              recommendation={recommendation}
              position={index + 1}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onRestart}>
          <RefreshCw aria-hidden="true" />
          Nowe wyszukiwanie
        </Button>
      </div>

      <DocumentedCasesList cases={result.similarCases} />
      <SupportingReportsList reports={result.reports} />
    </div>
  )
}
