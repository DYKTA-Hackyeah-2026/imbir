import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, PencilLine, RefreshCw, SearchX, TriangleAlert, Wand2 } from "lucide-react"

export function LoadingState() {
  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <Loader2 aria-hidden="true" className="size-10 animate-spin text-primary" />
      <h1 id="step-heading" tabIndex={-1} className="text-2xl font-bold">
        Szukamy rozwiązań dla Twojej potrzeby…
      </h1>
      <p className="max-w-md text-muted-foreground">
        Porównujemy opis z bazą innowacji społecznych. To może potrwać chwilę. Nie zamykaj
        tej strony.
      </p>
    </section>
  )
}

export function NoMatchState({
  description,
  incompleteEvidence,
  onEdit,
  onTryExample,
}: {
  description: string
  incompleteEvidence?: boolean
  onEdit: () => void
  onTryExample: () => void
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Nie znaleźliśmy wystarczająco trafnego dopasowania
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Twój opis został zachowany. Celowo nie pokazujemy przypadkowych ani
          wymyślonych rekomendacji, gdy nie mamy podstaw, by uznać je za trafne.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            Twój opis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground">{description}</p>
        </CardContent>
      </Card>

      {incompleteEvidence ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <AlertTitle>Dane źródłowe są niepełne</AlertTitle>
          <AlertDescription>
            W bazie nie ma rozwiązań z wystarczającymi podstawami źródłowymi dla tego
            opisu. Nie pokazujemy propozycji opartych na zbyt słabych danych.
          </AlertDescription>
        </Alert>
      ) : null}

      <Alert variant="info">
        <SearchX aria-hidden="true" />
        <AlertTitle>Co można zrobić dalej</AlertTitle>
        <AlertDescription>
          <ul className="ml-4 list-disc space-y-1">
            <li>Dopisz, kogo dotyczy potrzeba i w jakiej gminie lub powiecie występuje.</li>
            <li>Wskaż, jaki rezultat chcesz osiągnąć.</li>
            <li>Spróbuj opisać potrzebę innymi słowami.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" onClick={onEdit}>
          <PencilLine aria-hidden="true" />
          Popraw lub uzupełnij opis
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onTryExample}>
          <Wand2 aria-hidden="true" />
          Wypróbuj przykładową potrzebę
        </Button>
      </div>
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  onEdit,
}: {
  message: string
  onRetry: () => void
  onEdit: () => void
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Usługa jest chwilowo niedostępna
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Nie udało się teraz pobrać rekomendacji. Twój opis i odpowiedzi zostały
          zachowane.
        </p>
      </header>

      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>Wystąpił problem techniczny</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="button" size="lg" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Spróbuj ponownie
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onEdit}>
          Wróć do opisu
        </Button>
      </div>
    </div>
  )
}
