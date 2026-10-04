import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  FlaskConical,
  MapPin,
  Users,
} from "lucide-react"

import { ErrorState, LoadingState } from "@/components/States"
import { Badge } from "@/components/ui/badge"
import { ApiError, errorMessage } from "@/lib/api"
import {
  getCatalogueInnovation,
  getInnovationFeedback,
  getTest,
  type CatalogueInnovation,
  type InnovationFeedbackAggregate,
  type InnovationTest,
} from "@/lib/tester"
import { ApplyForm } from "./components/ApplyForm"
import { FeedbackSummary } from "./components/FeedbackSummary"
import { TestStatusBadge } from "./components/StatusBadge"
import { formatDateRange } from "./lib/format"

const EVIDENCE_LABELS: Record<
  CatalogueInnovation["evidenceStatus"],
  { label: string; variant: "strong" | "ok" | "ai" }
> = {
  documented: { label: "Rozwiązanie udokumentowane", variant: "strong" },
  partially_documented: { label: "Częściowo udokumentowane", variant: "ok" },
  synthetic: { label: "Rekord demonstracyjny", variant: "ai" },
}

export function TestDetailPage() {
  const { testId } = useParams<{ testId: string }>()
  const parsedId = testId && /^\d+$/.test(testId) ? Number.parseInt(testId, 10) : Number.NaN
  const invalidId = !Number.isSafeInteger(parsedId) || parsedId < 1

  const [test, setTest] = useState<InnovationTest | null>(null)
  const [innovation, setInnovation] = useState<CatalogueInnovation | null>(null)
  const [aggregate, setAggregate] = useState<InnovationFeedbackAggregate | null>(null)
  const [loading, setLoading] = useState(!invalidId)
  const [error, setError] = useState(invalidId ? "Niepoprawny identyfikator testu." : "")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    document.title = "Test innowacji – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    if (invalidId) return

    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const loaded = await getTest(parsedId)
        if (!active) return
        setTest(loaded)

        const [innovationResult, aggregateResult] = await Promise.all([
          getCatalogueInnovation(loaded.innovationId).catch(() => null),
          getInnovationFeedback(loaded.innovationId).catch(() => null),
        ])
        if (!active) return
        setInnovation(innovationResult)
        setAggregate(aggregateResult)
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof ApiError && caught.status === 404
              ? "Nie znaleziono testu o podanym identyfikatorze."
              : errorMessage(caught),
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [parsedId, invalidId, reloadKey])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <LoadingState label="Wczytywanie testu…" />
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          message={error || "Nie znaleziono testu."}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <p className="mt-4 text-center">
          <Link
            to="/tester"
            className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            Wróć do listy testów
          </Link>
        </p>
      </div>
    )
  }

  const dateRange = formatDateRange(test.startAt, test.endAt)
  const evidence = innovation ? EVIDENCE_LABELS[innovation.evidenceStatus] : null

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <FlaskConical aria-hidden="true" className="size-6 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-base font-semibold">Tester innowacji</p>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              Małopolski Hub Innowacji Społecznych
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/tester"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wróć do listy testów
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TestStatusBadge status={test.status} />
          {innovation?.synthetic ? <Badge variant="ai">Rekord demonstracyjny</Badge> : null}
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{test.title}</h1>
        <p className="mt-1 text-base font-medium text-blue-700 dark:text-blue-300">
          {innovation?.title ?? test.innovationTitle ?? test.innovationId}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-bold">O teście</h2>
              {test.description ? (
                <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-neutral-400">
                  {test.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                  Organizator nie dodał jeszcze szczegółowego opisu.
                </p>
              )}

              {test.instructions ? (
                <>
                  <h3 className="mt-4 font-semibold">Instrukcja dla testerów</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-neutral-400">
                    {test.instructions}
                  </p>
                </>
              ) : null}

              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {test.location ? (
                  <li className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950/40">
                    <MapPin
                      aria-hidden="true"
                      className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
                    />
                    {test.location}
                  </li>
                ) : null}
                {dateRange ? (
                  <li className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950/40">
                    <CalendarRange
                      aria-hidden="true"
                      className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
                    />
                    {dateRange}
                  </li>
                ) : null}
                <li className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950/40">
                  <Users
                    aria-hidden="true"
                    className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
                  />
                  {test.maxTesters === null
                    ? `zgłoszenia: ${test.applicationsCount ?? 0}`
                    : `wolne miejsca: ${test.slotsLeft ?? test.maxTesters}`}
                </li>
              </ul>
            </section>

            <section
              aria-labelledby="apply-heading"
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 id="apply-heading" className="text-lg font-bold">
                Zgłoś chęć udziału w testach
              </h2>
              <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-neutral-400">
                Wypełnij krótki formularz. Zgłoszenie jest bezpłatne i nie zobowiązuje do
                zakupu rozwiązania.
              </p>
              <ApplyForm test={test} />
            </section>

            <section
              aria-labelledby="feedback-heading"
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 id="feedback-heading" className="text-lg font-bold">
                Opinie testerów
              </h2>
              <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-neutral-400">
                Ocena przydatności i propozycje usprawnień od osób testujących rozwiązanie.
              </p>
              {aggregate ? (
                <FeedbackSummary aggregate={aggregate} />
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                  Nie udało się wczytać opinii testerów.
                </p>
              )}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            {innovation ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <h2 className="font-bold">O innowacji</h2>
                {evidence ? (
                  <p className="mt-2">
                    <Badge variant={evidence.variant}>{evidence.label}</Badge>
                  </p>
                ) : null}
                <p className="mt-3 text-sm text-slate-600 dark:text-neutral-400">
                  {innovation.summary}
                </p>
                <Link
                  to={`/innowacja/${encodeURIComponent(test.innovationId)}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                >
                  Zobacz innowację i jej testy
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
                  {innovation.disclaimer}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950">
              <h2 className="font-bold">Masz pytania?</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                Napisz do nas — pomożemy dobrać test do Twoich potrzeb.
              </p>
              <Link
                to="/kontakt"
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Skontaktuj się z nami
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
