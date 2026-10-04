import { useEffect, useState, type FormEvent } from "react"
import { CheckCircle2, Loader2, Plus, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api"
import {
  createTest,
  listCatalogueInnovations,
  type CatalogueSummary,
  type TestStatus,
} from "@/lib/tester"

const STATUS_OPTIONS: { value: TestStatus; label: string }[] = [
  { value: "recruiting", label: "Nabór otwarty" },
  { value: "active", label: "Test w trakcie" },
  { value: "completed", label: "Zakończony" },
  { value: "cancelled", label: "Anulowany" },
]

type Errors = {
  innovationId?: string
  title?: string
  maxTesters?: string
}

export function CreateTestForm({ onCreated }: { onCreated: () => void }) {
  const [catalogue, setCatalogue] = useState<CatalogueSummary[]>([])
  const [innovationId, setInnovationId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [maxTesters, setMaxTesters] = useState("")
  const [startAt, setStartAt] = useState("")
  const [endAt, setEndAt] = useState("")
  const [status, setStatus] = useState<TestStatus>("recruiting")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdTitle, setCreatedTitle] = useState("")

  useEffect(() => {
    let active = true
    listCatalogueInnovations()
      .then((items) => {
        if (active) setCatalogue(items)
      })
      .catch(() => {
        /* podpowiedzi są opcjonalne */
      })
    return () => {
      active = false
    }
  }, [])

  function validate(): Errors {
    const next: Errors = {}
    if (!innovationId.trim()) {
      next.innovationId = "Wybierz innowację z katalogu lub wpisz jej identyfikator."
    }
    if (title.trim().length < 3) {
      next.title = "Podaj nazwę testu (co najmniej 3 znaki)."
    }
    if (maxTesters.trim()) {
      const parsed = Number.parseInt(maxTesters, 10)
      if (!Number.isSafeInteger(parsed) || parsed < 1) {
        next.maxTesters = "Liczba testerów musi być dodatnią liczbą całkowitą."
      }
    }
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError("")
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const field = nextErrors.innovationId ? "test-innovation" : nextErrors.title ? "test-title" : "test-max"
      document.getElementById(field)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      await createTest({
        innovationId: innovationId.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        maxTesters: maxTesters.trim() ? Number.parseInt(maxTesters, 10) : undefined,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
        status,
      })
      setCreatedTitle(title.trim())
      setInnovationId("")
      setTitle("")
      setDescription("")
      setLocation("")
      setMaxTesters("")
      setStartAt("")
      setEndAt("")
      setStatus("recruiting")
      setErrors({})
      onCreated()
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 text-sm text-slate-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-neutral-300">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-sky-700 dark:text-sky-300" />
        Ta sekcja służy pracownikom ROPS Kraków do ogłaszania naborów testerów.
      </p>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {formError}
        </p>
      ) : null}

      {createdTitle ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
          Test „{createdTitle}” został utworzony.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="test-innovation">Innowacja</Label>
          <Input
            id="test-innovation"
            required
            list="catalogue-innovations"
            value={innovationId}
            onChange={(event) => setInnovationId(event.target.value)}
            placeholder="Wybierz lub wpisz identyfikator, np. syn-senior-neighborhood"
            className="h-10"
            aria-invalid={errors.innovationId ? true : undefined}
            aria-describedby={errors.innovationId ? "test-innovation-error" : undefined}
          />
          <datalist id="catalogue-innovations">
            {catalogue.map((item) => (
              <option key={item.innovationId} value={item.innovationId}>
                {item.title}
              </option>
            ))}
          </datalist>
          {errors.innovationId ? (
            <p id="test-innovation-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {errors.innovationId}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="test-title">Nazwa testu</Label>
          <Input
            id="test-title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Np. Pilotaż centrów sąsiedzkich"
            className="h-10"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "test-title-error" : undefined}
          />
          {errors.title ? (
            <p id="test-title-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {errors.title}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="test-description">Opis testu</Label>
        <Textarea
          id="test-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Na czym polega test, jak długo trwa i czego dotyczy?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="test-location">Miejsce</Label>
          <Input
            id="test-location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Np. Kraków / online"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-max">Limit testerów</Label>
          <Input
            id="test-max"
            inputMode="numeric"
            value={maxTesters}
            onChange={(event) => setMaxTesters(event.target.value.replace(/\D/g, ""))}
            placeholder="Np. 10"
            className="h-10"
            aria-invalid={errors.maxTesters ? true : undefined}
            aria-describedby={errors.maxTesters ? "test-max-error" : undefined}
          />
          {errors.maxTesters ? (
            <p id="test-max-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {errors.maxTesters}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-status">Status</Label>
          <select
            id="test-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TestStatus)}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="test-start">Start testu</Label>
          <Input
            id="test-start"
            type="date"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="test-end">Zakończenie testu</Label>
          <Input
            id="test-end"
            type="date"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
            className="h-10"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Tworzenie…
          </>
        ) : (
          <>
            <Plus aria-hidden="true" />
            Utwórz test
          </>
        )}
      </Button>
    </form>
  )
}
