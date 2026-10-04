import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { AlertCircle, CheckCircle2, Info, Loader2, Send } from "lucide-react"

import SiteLayout from "@/components/SiteLayout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api"
import {
  createProblemReport,
  type ProblemReporterType,
} from "@/lib/problemReports"
import { cn } from "@/lib/utils"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CATEGORY_OPTIONS = [
  "Seniorzy",
  "Zdrowie psychiczne",
  "Niepełnosprawność i dostępność",
  "Wykluczenie cyfrowe",
  "Rodzina i dzieci",
  "Bezrobocie",
  "Transport",
  "Mieszkalnictwo",
  "Inne",
]

const REPORTER_OPTIONS: {
  value: ProblemReporterType
  label: string
  description: string
}[] = [
  { value: "resident", label: "Mieszkaniec", description: "Zgłaszam problem w swoim otoczeniu." },
  { value: "ngo", label: "Organizacja pozarządowa", description: "Działamy w tej społeczności." },
  {
    value: "local_government",
    label: "Samorząd / JST",
    description: "Reprezentuję jednostkę samorządu.",
  },
  {
    value: "institution",
    label: "Instytucja",
    description: "Np. szkoła, CUS, ośrodek pomocy.",
  },
  { value: "other", label: "Inny", description: "Inny typ zgłaszającego." },
]

type Errors = {
  title?: string
  description?: string
  contactEmail?: string
}

export default function ProblemReportPage() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [municipality, setMunicipality] = useState("")
  const [county, setCounty] = useState("")
  const [reporterType, setReporterType] = useState<ProblemReporterType>("resident")
  const [contactEmail, setContactEmail] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)

  useEffect(() => {
    document.title = "Zgłoś problem · Małopolski Hub Innowacji Społecznych"
  }, [])

  function validate(): Errors {
    const next: Errors = {}
    if (title.trim().length < 3) next.title = "Podaj krótki tytuł problemu (co najmniej 3 znaki)."
    if (description.trim().length < 20) {
      next.description = "Opisz problem w co najmniej kilku zdaniach (minimum 20 znaków)."
    }
    if (contactEmail.trim() && !EMAIL_PATTERN.test(contactEmail.trim())) {
      next.contactEmail = "Podaj poprawny adres e-mail."
    }
    return next
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError("")
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const field = nextErrors.title ? "report-title" : nextErrors.description ? "report-description" : "report-email"
      document.getElementById(field)?.focus()
      return
    }

    setIsSubmitting(true)
    try {
      const report = await createProblemReport({
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
        municipality: municipality.trim() || undefined,
        county: county.trim() || undefined,
        reporterType,
        contactEmail: contactEmail.trim() || undefined,
      })
      setCreatedId(report.id)
    } catch (caught) {
      setFormError(errorMessage(caught))
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setTitle("")
    setDescription("")
    setCategory("")
    setMunicipality("")
    setCounty("")
    setReporterType("resident")
    setContactEmail("")
    setErrors({})
    setFormError("")
    setCreatedId(null)
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Zgłoś problem</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Opisz problem społeczny w swoim otoczeniu. Zgłoszenie trafi do Małopolskiego
          Hubu Innowacji Społecznych, a jego status będzie widoczny publicznie — dzięki
          temu proces jest przejrzysty.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          {createdId !== null ? (
            <div role="status" className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 aria-hidden="true" className="size-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold">Dziękujemy za zgłoszenie!</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Zgłoszenie nr <strong>#{createdId}</strong> zostało przyjęte. Zespół Hubu
                zweryfikuje problem i opublikuje odpowiedź w zakładce „Zgłoszone
                problemy”.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  to="/raporty?type=problems"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Zobacz zgłoszone problemy
                </Link>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Zgłoś kolejny problem
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <Alert variant="info">
                <Info aria-hidden="true" />
                <AlertTitle>Zgłoszenie jest publiczne</AlertTitle>
                <AlertDescription>
                  Treść problemu pojawi się w zakładce „Raporty → Zgłoszone problemy”.
                  Nie podawaj imion, nazwisk ani danych osób trzecich — adres e-mail
                  kontaktowy nie jest publikowany.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="report-title">Tytuł problemu</Label>
                <Input
                  id="report-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value.slice(0, 300))}
                  placeholder="Np. Brak transportu do lekarza na wsi"
                  className="h-10"
                  required
                  aria-invalid={errors.title ? true : undefined}
                  aria-describedby={errors.title ? "report-title-error" : undefined}
                />
                {errors.title ? (
                  <p id="report-title-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    {errors.title}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-description">Opis problemu</Label>
                <Textarea
                  id="report-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 5000))}
                  rows={6}
                  placeholder="Opisz, kogo dotyczy problem, jak często występuje i jakie ma skutki. Nie podawaj danych osobowych."
                  required
                  aria-invalid={errors.description ? true : undefined}
                  aria-describedby={errors.description ? "report-description-error" : undefined}
                />
                <div className="flex items-center justify-between gap-3">
                  {errors.description ? (
                    <p id="report-description-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                      {errors.description}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="ml-auto text-xs text-slate-400 tabular-nums dark:text-neutral-500">
                    {description.length}/5000
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-category">Obszar problemu</Label>
                <select
                  id="report-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
                >
                  <option value="">Wybierz obszar (opcjonalnie)</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="text-base font-medium">Kto zgłasza problem?</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {REPORTER_OPTIONS.map((option) => {
                    const selected = reporterType === option.value
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2",
                          selected
                            ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 dark:border-blue-500 dark:bg-blue-950/40"
                            : "border-slate-200 bg-white hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900",
                        )}
                      >
                        <input
                          type="radio"
                          name="reporter-type"
                          value={option.value}
                          checked={selected}
                          onChange={() => setReporterType(option.value)}
                          className="sr-only"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{option.label}</span>
                          <span className="block text-xs text-slate-500 dark:text-neutral-400">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="report-municipality">Gmina lub miejscowość</Label>
                  <Input
                    id="report-municipality"
                    value={municipality}
                    onChange={(event) => setMunicipality(event.target.value.slice(0, 160))}
                    placeholder="Np. Zielonki"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="report-county">Powiat</Label>
                  <Input
                    id="report-county"
                    value={county}
                    onChange={(event) => setCounty(event.target.value.slice(0, 160))}
                    placeholder="Np. krakowski"
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="report-email">Kontaktowy adres e-mail (opcjonalnie)</Label>
                <Input
                  id="report-email"
                  autoComplete="email"
                  type="email"
                  inputMode="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value.slice(0, 320))}
                  placeholder="Np. jan@example.com"
                  className="h-10"
                  aria-invalid={errors.contactEmail ? true : undefined}
                  aria-describedby={errors.contactEmail ? "report-email-error" : undefined}
                />
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Podaj, jeśli chcesz otrzymać odpowiedź. Adres nie jest publikowany.
                </p>
                {errors.contactEmail ? (
                  <p id="report-email-error" role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
                    {errors.contactEmail}
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 w-full bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin" />
                    Wysyłanie…
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" className="size-4" />
                    Wyślij zgłoszenie
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  )
}
