import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, PencilLine, Search, Sparkles } from "lucide-react"
import { AUDIENCE_LABELS, NEED_TAG_LABELS } from "../labels"
import type { NeedProfile } from "../types"

type ReviewStepProps = {
  profile: NeedProfile
  hasQuestions: boolean
  onEditDescription: () => void
  onBackToQuestions: () => void
  onConfirm: () => void
}

export function ReviewStep({
  profile,
  hasQuestions,
  onEditDescription,
  onBackToQuestions,
  onConfirm,
}: ReviewStepProps) {
  const { draft, tags, audiences, location, outcomeKeywords, answers } = profile
  const hasInterpretation = tags.length > 0 || audiences.length > 0

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Sprawdź, jak rozumiemy Twoją potrzebę
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Poniższe podsumowanie powstało automatycznie na podstawie Twojego opisu. Możesz
          je poprawić przed wyszukaniem rozwiązań.
        </p>
      </header>

      <Alert variant="info">
        <Sparkles aria-hidden="true" />
        <AlertTitle>To interpretacja przygotowana przez AI</AlertTitle>
        <AlertDescription>
          Rozpoznane obszary i grupy to nasza automatyczna interpretacja, a nie fakty ze
          źródeł. Jeżeli coś się nie zgadza, popraw opis lub wróć do pytań.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle as="h2" className="text-lg">Twój opis</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={onEditDescription}>
              <PencilLine aria-hidden="true" />
              Popraw opis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{draft.description}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Rozpoznane obszary potrzeby</CardTitle>
          </CardHeader>
          <CardContent>
            {tags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {NEED_TAG_LABELS[tag]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                Nie rozpoznaliśmy jeszcze wystarczającej liczby informacji. Dopasowania
                mogą być ograniczone.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2" className="text-lg">Rozpoznane grupy</CardTitle>
          </CardHeader>
          <CardContent>
            {audiences.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {audiences.map((audience) => (
                  <li
                    key={audience}
                    className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                  >
                    {AUDIENCE_LABELS[audience]}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Brak danych o grupie docelowej.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">Pozostałe informacje</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Gmina lub powiat</dt>
              <dd>
                {location.municipality || location.county
                  ? [location.municipality, location.county].filter(Boolean).join(", ")
                  : "Brak danych"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Oczekiwany rezultat</dt>
              <dd>
                {draft.desiredOutcome.trim() ||
                  answers.outcome ||
                  (outcomeKeywords.length > 0 ? "Rozpoznany z opisu" : "Brak danych")}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Dostępne zasoby</dt>
              <dd>{draft.availableResources.trim() || answers.resources || "Brak danych"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Budżet</dt>
              <dd>{draft.budget.trim() || "Brak danych"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Czas realizacji</dt>
              <dd>{draft.timeframe.trim() || "Brak danych"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Potrzeby dostępności</dt>
              <dd>{draft.accessibilityNeeds.trim() || "Brak danych"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {!hasInterpretation ? (
        <Alert variant="warning">
          <AlertTitle>Potrzebujemy trochę więcej informacji</AlertTitle>
          <AlertDescription>
            Możemy spróbować wyszukać rozwiązania, ale bez rozpoznanych obszarów wynik może
            być pusty. Warto uzupełnić opis: kogo dotyczy potrzeba i jakiego wsparcia
            oczekujesz.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" size="lg" onClick={onEditDescription}>
            <ArrowLeft aria-hidden="true" />
            Popraw opis
          </Button>
          {hasQuestions ? (
            <Button type="button" variant="ghost" size="lg" onClick={onBackToQuestions}>
              Wróć do pytań
            </Button>
          ) : null}
        </div>
        <Button type="button" size="lg" onClick={onConfirm}>
          <Search aria-hidden="true" />
          Zatwierdź i szukaj rozwiązań
        </Button>
      </div>
    </div>
  )
}
