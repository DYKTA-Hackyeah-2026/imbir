import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  ExternalLink,
  FlaskConical,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react"

import { ErrorState, LoadingState } from "@/components/States"
import { Badge } from "@/components/ui/badge"
import { errorMessage } from "@/lib/api"
import { getInnovationDetail, type InnovationDetail } from "@/lib/innovations"
import {
  getInnovationFeedback,
  listTests,
  type InnovationFeedbackAggregate,
  type InnovationTest,
} from "@/lib/tester"
import { FeedbackSummary } from "@/features/tester/components/FeedbackSummary"
import { ApplyForm } from "@/features/tester/components/ApplyForm"
import { TestStatusBadge } from "@/features/tester/components/StatusBadge"
import { formatDateRange } from "@/features/tester/lib/format"
import { tagLabel } from "./components/InnovationCard"

const EVIDENCE_LABELS: Record<
  InnovationDetail["evidenceStatus"],
  { label: string; variant: "strong" | "ok" | "ai" }
> = {
  documented: { label: "Rozwiązanie udokumentowane", variant: "strong" },
  partially_documented: { label: "Częściowo udokumentowane", variant: "ok" },
  synthetic: { label: "Rekord demonstracyjny", variant: "ai" },
}

function TestRow({ test }: { test: InnovationTest }) {
  const dateRange = formatDateRange(test.startAt, test.endAt)
  const canApply = test.status === "recruiting" || test.status === "active"

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold">{test.title}</h3>
          {test.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">
              {test.description}
            </p>
          ) : null}
        </div>
        <TestStatusBadge status={test.status} />
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-neutral-400">
        {test.location ? (
          <li className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4" />
            {test.location}
          </li>
        ) : null}
        {dateRange ? (
          <li className="inline-flex items-center gap-1.5">
            <CalendarRange aria-hidden="true" className="size-4" />
            {dateRange}
          </li>
        ) : null}
        {test.maxTesters !== null ? (
          <li className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-4" />
            limit testerów: {test.maxTesters}
          </li>
        ) : null}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Link
          to={`/tester/${test.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          Szczegóły testu
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {canApply ? (
        <details className="mt-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <summary className="cursor-pointer text-sm font-semibold text-blue-800 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-blue-200">
            Zgłoś się do tego testu
          </summary>
          <div className="mt-3">
            <ApplyForm test={test} />
          </div>
        </details>
      ) : null}
    </li>
  )
}

export function InnovationPage() {
  const { innovationId } = useParams<{ innovationId: string }>()
  const invalidId = !innovationId || innovationId.length > 200

  const [detail, setDetail] = useState<InnovationDetail | null>(null)
  const [tests, setTests] = useState<InnovationTest[]>([])
  const [aggregate, setAggregate] = useState<InnovationFeedbackAggregate | null>(null)
  const [loading, setLoading] = useState(!invalidId)
  const [error, setError] = useState(
    invalidId ? "Niepoprawny identyfikator innowacji." : "",
  )
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    document.title = "Innowacja – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    if (invalidId || !innovationId) return
    const id = innovationId

    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const loaded = await getInnovationDetail(id)
        if (!active) return
        setDetail(loaded)

        const [testsResult, aggregateResult] = await Promise.all([
          listTests({ innovationId: id, limit: 20 }).catch(() => null),
          getInnovationFeedback(id).catch(() => null),
        ])
        if (!active) return
        setTests(testsResult?.data ?? [])
        setAggregate(aggregateResult)
      } catch (caught) {
        if (active) {
          setError(
            (caught as { status?: number }).status === 404
              ? "Nie znaleziono innowacji o podanym identyfikatorze."
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
  }, [innovationId, invalidId, reloadKey])

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <LoadingState label="Wczytywanie innowacji…" />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState
          message={error || "Nie znaleziono innowacji."}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
        <p className="mt-4 text-center">
          <Link
            to="/innowacje"
            className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
          >
            Wróć do biblioteki innowacji
          </Link>
        </p>
      </div>
    )
  }

  const evidence = EVIDENCE_LABELS[detail.evidenceStatus]
  const openTests = tests.filter(
    (test) => test.status === "recruiting" || test.status === "active",
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/innowacje"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wróć do biblioteki innowacji
        </Link>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge variant={evidence.variant}>{evidence.label}</Badge>
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{detail.title}</h1>
        <p className="mt-2 max-w-3xl text-lg text-slate-600 dark:text-neutral-400">
          {detail.summary}
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_19rem]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-bold">Opis rozwiązania</h2>
              <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-neutral-400">
                {detail.description}
              </p>

              {detail.problemTags.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Obszary problemowe</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {detail.problemTags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {tagLabel(tag)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.targetGroups.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold">Grupy docelowe</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                    {detail.targetGroups.join(", ")}
                  </p>
                </div>
              ) : null}

              {detail.testedIn.length > 0 || detail.applicableContexts.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {detail.testedIn.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold">Testowane w</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                        {detail.testedIn.join(", ")}
                      </p>
                    </div>
                  ) : null}
                  {detail.applicableContexts.length > 0 ? (
                    <div>
                      <h3 className="text-sm font-semibold">Konteksty zastosowania</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                        {detail.applicableContexts.join(", ")}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {detail.prerequisites.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold">Warunki wdrożenia</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-neutral-400">
                      {detail.prerequisites.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {detail.resourcesRequired.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold">Potrzebne zasoby</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-neutral-400">
                      {detail.resourcesRequired.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-400">
                {detail.disclaimer}
              </p>
            </section>

            <section
              aria-labelledby="innovation-tests-heading"
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 id="innovation-tests-heading" className="text-lg font-bold">
                Testy tej innowacji
              </h2>
              <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-neutral-400">
                Zgłoś się do testu, aby sprawdzić rozwiązanie w praktyce i podzielić się
                opinią.
              </p>
              {tests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
                  <FlaskConical aria-hidden="true" className="mx-auto mb-2 size-6" />
                  <p>Ta innowacja nie ma jeszcze ogłoszonych testów.</p>
                  <Link
                    to="/tester"
                    className="mt-2 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                  >
                    Zobacz wszystkie testy
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {tests.map((test) => (
                    <TestRow key={test.id} test={test} />
                  ))}
                </ul>
              )}
            </section>

            <section
              aria-labelledby="innovation-feedback-heading"
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 id="innovation-feedback-heading" className="text-lg font-bold">
                Opinie testerów
              </h2>
              <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-neutral-400">
                Oceny i propozycje usprawnień od osób, które testowały rozwiązanie.
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
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm dark:border-blue-900 dark:from-neutral-900 dark:to-neutral-950">
              <h2 className="font-bold">Zgłoś się do testów</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                {openTests.length > 0
                  ? `Ta innowacja ma ${openTests.length} ${
                      openTests.length === 1 ? "aktywny test" : "aktywne testy"
                    }. Wybierz test i wypełnij krótki formularz.`
                  : "Nie ma teraz otwartego naboru testerów. Zobacz pozostałe innowacje."}
              </p>
              <Link
                to={openTests.length > 0 ? `/tester/${openTests[0].id}` : "/tester"}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <FlaskConical aria-hidden="true" className="size-4" />
                {openTests.length > 0 ? "Zgłoś się do testu" : "Przeglądaj testy"}
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="flex items-center gap-2 font-bold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4.5 text-blue-600 dark:text-blue-400"
                />
                Źródło
              </h2>
              <p className="mt-2 text-sm font-medium">{detail.source.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                {detail.source.urlVerified
                  ? "Adres źródła zweryfikowany."
                  : "Adres źródła nie został zweryfikowany w tej instancji."}
              </p>
              {detail.source.url ? (
                <a
                  href={detail.source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 break-all text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                >
                  Otwórz źródło
                  <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
