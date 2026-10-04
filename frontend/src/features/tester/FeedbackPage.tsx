import { useEffect, useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Send } from "lucide-react"

import SiteHeader from "@/components/SiteHeader"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, errorMessage } from "@/lib/api"
import { submitTesterFeedback } from "@/lib/tester"
import { cn } from "@/lib/utils"
import { RatingScale } from "./components/RatingScale"

type Errors = {
  overallRating?: string
}

export function FeedbackPage() {
  const { applicationId } = useParams<{ applicationId: string }>()
  const parsedId =
    applicationId && /^\d+$/.test(applicationId)
      ? Number.parseInt(applicationId, 10)
      : Number.NaN

  const [overallRating, setOverallRating] = useState<number | null>(null)
  const [usefulnessRating, setUsefulnessRating] = useState<number | null>(null)
  const [easeOfUseRating, setEaseOfUseRating] = useState<number | null>(null)
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null)
  const [whatWorked, setWhatWorked] = useState("")
  const [problems, setProblems] = useState("")
  const [suggestions, setSuggestions] = useState("")
  const [comment, setComment] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = "Informacja zwrotna – Małopolski Hub Innowacji Społecznych"
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError("")
    if (overallRating === null) {
      setErrors({ overallRating: "Wybierz ocenę ogólną (1–5)." })
      document.querySelector<HTMLInputElement>('input[name="overall-rating"]')?.focus()
      return
    }
    setErrors({})

    if (!Number.isSafeInteger(parsedId) || parsedId < 1) {
      setFormError("Niepoprawny identyfikator zgłoszenia.")
      return
    }

    setIsSubmitting(true)
    try {
      await submitTesterFeedback(parsedId, {
        overallRating,
        usefulnessRating: usefulnessRating ?? undefined,
        easeOfUseRating: easeOfUseRating ?? undefined,
        wouldUseAgain: wouldUseAgain ?? undefined,
        whatWorked: whatWorked.trim() || undefined,
        problems: problems.trim() || undefined,
        suggestions: suggestions.trim() || undefined,
        comment: comment.trim() || undefined,
      })
      setSent(true)
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 404) {
        setFormError("Nie znaleziono zgłoszenia o podanym identyfikatorze.")
      } else {
        setFormError(errorMessage(caught))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/tester"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wróć do listy testów
        </Link>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
          Informacja zwrotna z testów
        </h1>
        <p className="mt-2 text-slate-600 dark:text-neutral-400">
          Oceń rozwiązanie, które testujesz, i zaproponuj usprawnienia. Twoja opinia
          pomoże ulepszyć innowację.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          {sent ? (
            <div role="status" className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <CheckCircle2 aria-hidden="true" className="size-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold">Dziękujemy za opinię!</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Informacja zwrotna została zapisana i trafi do organizatora testu oraz
                zespołu ROPS Kraków.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  to="/tester/moje"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Moje zgłoszenia
                </Link>
                <Link
                  to="/tester"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Wróć do listy testów
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle aria-hidden="true" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <RatingScale
                legend="Ocena ogólna rozwiązania"
                hint="Jak ogólnie oceniasz testowane rozwiązanie?"
                name="overall-rating"
                value={overallRating}
                onChange={(value) => {
                  setOverallRating(value)
                  setErrors({})
                }}
                error={errors.overallRating}
                required
              />

              <RatingScale
                legend="Przydatność dla Twojej społeczności"
                hint="Na ile rozwiązanie odpowiada na realną potrzebę?"
                name="usefulness-rating"
                value={usefulnessRating}
                onChange={setUsefulnessRating}
              />

              <RatingScale
                legend="Łatwość użycia"
                hint="Jak łatwe w obsłudze było rozwiązanie dla użytkowników?"
                name="ease-rating"
                value={easeOfUseRating}
                onChange={setEaseOfUseRating}
              />

              <fieldset>
                <legend className="text-base font-medium">
                  Czy użyłbyś tego rozwiązania ponownie?
                </legend>
                <div className="mt-3 flex gap-3">
                  {[
                    { value: true, label: "Tak" },
                    { value: false, label: "Nie" },
                  ].map((option) => {
                    const selected = wouldUseAgain === option.value
                    return (
                      <label
                        key={option.label}
                        className={cn(
                          "cursor-pointer rounded-full border px-5 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-500 has-[:focus-visible]:ring-offset-2",
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
                        )}
                      >
                        <input
                          type="radio"
                          name="would-use-again"
                          checked={selected}
                          onChange={() => setWouldUseAgain(option.value)}
                          className="sr-only"
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <div className="space-y-2">
                <Label htmlFor="feedback-worked">Co działało dobrze?</Label>
                <Textarea
                  id="feedback-worked"
                  value={whatWorked}
                  onChange={(event) => setWhatWorked(event.target.value.slice(0, 5000))}
                  rows={3}
                  placeholder="Np. prosta obsługa, jasna instrukcja, dobre wsparcie koordynatora."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-problems">Jakie problemy zauważyłeś?</Label>
                <Textarea
                  id="feedback-problems"
                  value={problems}
                  onChange={(event) => setProblems(event.target.value.slice(0, 5000))}
                  rows={3}
                  placeholder="Np. brak transportu, zbyt skomplikowany formularz, trudności dla seniorów."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-suggestions">Propozycje usprawnień</Label>
                <Textarea
                  id="feedback-suggestions"
                  value={suggestions}
                  onChange={(event) => setSuggestions(event.target.value.slice(0, 5000))}
                  rows={3}
                  placeholder="Np. dodać wersję papierową, uprościć zgłoszenia, wydłużyć pilotaż."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-comment">Dodatkowy komentarz</Label>
                <Textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(event) => setComment(event.target.value.slice(0, 5000))}
                  rows={2}
                  placeholder="Opcjonalnie"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 aria-hidden="true" className="animate-spin" />
                    Zapisywanie…
                  </>
                ) : (
                  <>
                    <Send aria-hidden="true" />
                    Wyślij informację zwrotną
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
