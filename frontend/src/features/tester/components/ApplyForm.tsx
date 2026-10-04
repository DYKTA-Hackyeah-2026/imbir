import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquareQuote,
  Send,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { errorMessage } from "@/lib/api"
import { applyForTest, type InnovationTest } from "@/lib/tester"

export function ApplyForm({ test }: { test: InnovationTest }) {
  const [motivation, setMotivation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [applicationId, setApplicationId] = useState<number | null>(null)

  const closed = test.status !== "recruiting" && test.status !== "active"
  const noSlots = test.maxTesters !== null && (test.slotsLeft ?? test.maxTesters) <= 0

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const application = await applyForTest(test.id, motivation.trim() || undefined)
      setApplicationId(application.id)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (closed) {
    return (
      <Alert variant="warning">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Nabór zakończony</AlertTitle>
        <AlertDescription>
          Ten test nie przyjmuje już nowych zgłoszeń. Sprawdź pozostałe aktywne testy.
        </AlertDescription>
      </Alert>
    )
  }

  if (noSlots) {
    return (
      <Alert variant="warning">
        <AlertCircle aria-hidden="true" />
        <AlertTitle>Brak wolnych miejsc</AlertTitle>
        <AlertDescription>
          Limit testerów dla tego testu został osiągnięty. Zobacz inne testy w{" "}
          <Link to="/tester" className="font-semibold underline">
            liście testów
          </Link>
          .
        </AlertDescription>
      </Alert>
    )
  }

  if (applicationId !== null) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950/30"
      >
        <CheckCircle2
          aria-hidden="true"
          className="mx-auto size-8 text-emerald-700 dark:text-emerald-400"
        />
        <h3 className="mt-2 text-lg font-bold">Zgłoszenie przyjęte</h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Dziękujemy! Twoje zgłoszenie nr <strong>#{applicationId}</strong> czeka na
          potwierdzenie przez organizatora.
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Zaloguj się, aby śledzić status zgłoszenia w sekcji „Moje zgłoszenia”.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link
            to={`/tester/feedback/${applicationId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <MessageSquareQuote aria-hidden="true" className="size-4" />
            Przekaż opinię po testach
          </Link>
          <Link
            to="/tester/moje"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <ClipboardList aria-hidden="true" className="size-4" />
            Moje zgłoszenia
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`apply-motivation-${test.id}`}>
          Dlaczego chcesz wziąć udział w testach?
        </Label>
        <Textarea
          id={`apply-motivation-${test.id}`}
          value={motivation}
          onChange={(event) => setMotivation(event.target.value.slice(0, 2000))}
          rows={4}
          placeholder="Np. prowadzę Centrum Usług Społecznych i chcę sprawdzić to rozwiązanie w naszej gminie."
        />
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Pole opcjonalne, ale pomaga organizatorowi dobrać uczestników.{" "}
          {motivation.length}/2000
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
        {isSubmitting ? (
          <>
            <Loader2 aria-hidden="true" className="animate-spin" />
            Wysyłanie…
          </>
        ) : (
          <>
            <Send aria-hidden="true" />
            Zgłoś chęć udziału
          </>
        )}
      </Button>
    </form>
  )
}
