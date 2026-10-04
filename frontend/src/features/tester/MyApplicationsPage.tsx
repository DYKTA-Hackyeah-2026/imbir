import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  MessageSquareQuote,
  Pencil,
} from "lucide-react"

import SiteHeader from "@/components/SiteHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import {
  getMyApplications,
  listCatalogueInnovations,
  type MyApplication,
} from "@/lib/tester"
import { ApplicationStatusBadge } from "./components/StatusBadge"
import { Stars } from "./components/RatingScale"
import { formatDateTime } from "./lib/format"

export function MyApplicationsPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [catalogueTitles, setCatalogueTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    document.title = "Moje zgłoszenia – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    let active = true
    listCatalogueInnovations()
      .then((items) => {
        if (!active) return
        setCatalogueTitles(
          Object.fromEntries(items.map((item) => [item.innovationId, item.title])),
        )
      })
      .catch(() => {
        /* nazwy innowacji są opcjonalnym wzbogaceniem listy */
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const result = await getMyApplications()
        if (!active) return
        setApplications(result.data)
      } catch (caught) {
        if (active) setError(errorMessage(caught))
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [reloadKey])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          to="/tester"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wróć do listy testów
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600/10">
            <ClipboardList aria-hidden="true" className="size-6 text-blue-700 dark:text-blue-300" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Moje zgłoszenia
            </h1>
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              Zgłoszenia testów powiązane z kontem {user?.email}.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingState label="Wczytywanie zgłoszeń…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
          ) : applications.length === 0 ? (
            <EmptyState message="Nie masz jeszcze żadnych zgłoszeń. Wybierz test z listy i zgłoś chęć udziału." />
          ) : (
            <ul className="space-y-4">
              {applications.map((application) => {
                const test = application.test
                const feedback = application.feedback
                return (
                  <li
                    key={application.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold">
                          {test?.title ?? `Test #${application.testId}`}
                        </h2>
                        <p className="mt-0.5 text-sm font-medium text-blue-700 dark:text-blue-300">
                          {(test ? catalogueTitles[test.innovationId] : null) ??
                            test?.innovationTitle ??
                            test?.innovation?.title ??
                            test?.innovationId ??
                            ""}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={application.status} />
                    </div>

                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-neutral-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays aria-hidden="true" className="size-4" />
                        zgłoszono: {formatDateTime(application.createdAt) ?? "–"}
                      </span>
                    </p>

                    {application.motivation ? (
                      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-neutral-950/40 dark:text-neutral-400">
                        {application.motivation}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-neutral-800">
                      {feedback ? (
                        <>
                          <span className="inline-flex items-center gap-2 text-sm font-medium">
                            Twoja ocena:
                            <Stars value={feedback.overallRating} size="size-4" />
                            <span className="tabular-nums">{feedback.overallRating}/5</span>
                          </span>
                          <Link
                            to={`/tester/feedback/${application.id}`}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                          >
                            <Pencil aria-hidden="true" className="size-3.5" />
                            Edytuj opinię
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/tester/feedback/${application.id}`}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
                        >
                          <MessageSquareQuote aria-hidden="true" className="size-4" />
                          Przekaż informację zwrotną
                        </Link>
                      )}

                      {test ? (
                        <Link
                          to={`/tester/${test.id}`}
                          className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700 dark:text-neutral-300 dark:hover:text-blue-300"
                        >
                          <FlaskConical aria-hidden="true" className="size-4" />
                          Szczegóły testu
                        </Link>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
