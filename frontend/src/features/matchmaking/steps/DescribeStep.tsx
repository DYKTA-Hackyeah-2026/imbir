import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, Search, ShieldAlert, Wand2 } from "lucide-react"
import type { NeedDraft } from "../types"

export const EXAMPLE_DESCRIPTION =
  "W naszej gminie wiele starszych osób mieszka samotnie. Mają trudności z dojazdem do lekarza i sklepu, a ich rodziny mieszkają daleko. Chcielibyśmy pomóc im dłużej zachować samodzielność i ograniczyć poczucie osamotnienia."

type DescribeStepProps = {
  draft: NeedDraft
  onChange: (patch: Partial<NeedDraft>) => void
  onSubmit: () => void
}

export function DescribeStep({ draft, onChange, onSubmit }: DescribeStepProps) {
  const [error, setError] = useState<string | null>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (draft.description.trim().length < 15) {
      setError("Opisz potrzebę w co najmniej kilku zdaniach, abyśmy mogli dobrać rozwiązania.")
      descriptionRef.current?.focus()
      return
    }
    setError(null)
    onSubmit()
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Znajdź rozwiązanie dla swojej społeczności
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Opisz swoją potrzebę, a my pokażemy istniejące innowacje społeczne, które mogą
          jej odpowiadać. Opis nie wymaga rejestracji ani logowania.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="need-description">Opisz problem lub potrzebę</Label>
          <Textarea
            id="need-description"
            ref={descriptionRef}
            value={draft.description}
            onChange={(event) => {
              onChange({ description: event.target.value })
              if (error) setError(null)
            }}
            className="min-h-40 text-base"
            placeholder="Np. W naszej gminie wiele starszych osób mieszka samotnie i ma utrudniony dostęp do lekarza."
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby="need-description-help need-description-example"
          />
          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div
            id="need-description-help"
            className="flex items-start gap-1.5 text-sm text-muted-foreground"
          >
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              Nie podawaj imion, nazwisk, adresów ani informacji o zdrowiu konkretnych osób.
              Opisz sytuację ogólnie.
            </p>
          </div>
        </div>

        <Alert id="need-description-example" variant="info">
          <Wand2 aria-hidden="true" />
          <AlertDescription>
            <p>
              <span className="font-medium text-foreground">Przykład opisu: </span>
              „{EXAMPLE_DESCRIPTION}”
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                onChange({ description: EXAMPLE_DESCRIPTION })
                setError(null)
              }}
            >
              Wstaw ten przykład
            </Button>
          </AlertDescription>
        </Alert>

        <details className="rounded-lg border border-border p-4">
          <summary className="cursor-pointer rounded-sm text-base font-medium focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            Dodaj szczegóły (opcjonalnie)
          </summary>
          <p className="mt-2 text-sm text-muted-foreground">
            Szczegóły nie są wymagane. Jeśli je podasz, dopasowanie może być trafniejsze.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <OptionalField
              id="need-who"
              label="Kto potrzebuje wsparcia"
              value={draft.whoNeedsSupport}
              onChange={(value) => onChange({ whoNeedsSupport: value })}
              placeholder="Np. osoby starsze mieszkające samotnie"
            />
            <OptionalField
              id="need-municipality"
              label="Gmina lub miejscowość"
              value={draft.municipality}
              onChange={(value) => onChange({ municipality: value })}
              placeholder="Np. Wieliczka"
            />
            <OptionalField
              id="need-county"
              label="Powiat"
              value={draft.county}
              onChange={(value) => onChange({ county: value })}
              placeholder="Np. powiat wielicki"
            />
            <OptionalField
              id="need-resources"
              label="Dostępne zasoby"
              value={draft.availableResources}
              onChange={(value) => onChange({ availableResources: value })}
              placeholder="Np. świetlica i grupa wolontariuszy"
            />
            <OptionalField
              id="need-budget"
              label="Budżet"
              value={draft.budget}
              onChange={(value) => onChange({ budget: value })}
              placeholder="Np. 20 000 zł na start"
            />
            <OptionalField
              id="need-timeframe"
              label="Czas realizacji"
              value={draft.timeframe}
              onChange={(value) => onChange({ timeframe: value })}
              placeholder="Np. 6 miesięcy"
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="need-outcome">Oczekiwany rezultat</Label>
              <Textarea
                id="need-outcome"
                value={draft.desiredOutcome}
                onChange={(event) => onChange({ desiredOutcome: event.target.value })}
                placeholder="Np. poprawa samodzielności i mniejsze poczucie osamotnienia"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="need-accessibility">Potrzeby w zakresie dostępności</Label>
              <Textarea
                id="need-accessibility"
                value={draft.accessibilityNeeds}
                onChange={(event) => onChange({ accessibilityNeeds: event.target.value })}
                placeholder="Np. dostępność dla osób poruszających się na wózkach, tekst łatwy do czytania"
              />
            </div>
          </div>
        </details>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" className="sm:w-auto">
            <Search aria-hidden="true" />
            Znajdź rozwiązania
          </Button>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="size-4" />
            Wyszukiwanie jest bezpłatne i nie wymaga konta.
          </p>
        </div>
      </form>
    </div>
  )
}

function OptionalField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}
