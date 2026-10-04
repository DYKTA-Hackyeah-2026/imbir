import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { CalendarDays, MapPin, MessageSquareReply, Plus, UserRound } from "lucide-react"

import Pagination from "@/components/Pagination"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { errorMessage } from "@/lib/api"
import {
  listProblemReports,
  type ProblemReport,
  type ProblemReportStatus,
} from "@/lib/problemReports"
import { cn } from "@/lib/utils"
import { formatDate } from "@/features/tester/lib/format"
import { ProblemStatusBadge, REPORTER_LABELS } from "./status"

const PAGE_SIZE = 10

const STATUS_FILTERS: { value: ProblemReportStatus | ""; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "new", label: "Nowe" },
  { value: "in_review", label: "W analizie" },
  { value: "planned", label: "Zaplanowane" },
  { value: "resolved", label: "Rozwiązane" },
]

function ProblemCard({ report }: { report: ProblemReport }) {
  const location = [report.municipality, report.county].filter(Boolean).join(", ")
  const date = formatDate(report.createdAt)

  return (
    <li className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg leading-snug font-bold">{report.title}</h3>
        <ProblemStatusBadge status={report.status} />
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <UserRound aria-hidden="true" className="size-4" />
          {REPORTER_LABELS[report.reporterType]}
        </span>
        {location ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4" />
            {location}
          </span>
        ) : null}
        {date ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="size-4" />
            {date}
          </span>
        ) : null}
        {report.category ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
            {report.category}
          </span>
        ) : null}
      </p>

      <p className="mt-3 text-sm text-slate-600 dark:text-neutral-400">
        {report.description}
      </p>

      {report.adminResponse ? (
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200">
            <MessageSquareReply aria-hidden="true" className="size-3.5" />
            Odpowiedź Hubu
          </p>
          <p className="mt-1 text-sm text-slate-700 dark:text-neutral-300">
            {report.adminResponse}
          </p>
        </div>
      ) : null}
    </li>
  )
}

export function ProblemReportsPanel() {
  const [reports, setReports] = useState<ProblemReport[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<ProblemReportStatus | "">("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const result = await listProblemReports({
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
        if (!active) return
        setReports(result.data)
        setTotal(result.total)
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
  }, [status, page, reloadKey])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500 dark:text-neutral-400">
        Zgłoszenia od mieszkańców i organizacji. Hub monitoruje ich status i odpowiada
        na zgłoszenia.
      </p>

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtruj według statusu">
        {STATUS_FILTERS.map((filter) => {
          const active = status === filter.value
          return (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setStatus(filter.value)
                setPage(1)
              }}
              aria-pressed={active}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                active
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <LoadingState label="Wczytywanie zgłoszeń…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : reports.length === 0 ? (
        <div>
          <EmptyState message="Nie ma jeszcze zgłoszeń dla wybranego filtra." />
          <div className="mt-4 text-center">
            <Link
              to="/zglos-problem"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <Plus aria-hidden="true" className="size-4" />
              Zgłoś pierwszy problem
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p role="status" className="mb-3 text-sm text-slate-500 dark:text-neutral-400">
            {total} {total === 1 ? "zgłoszenie" : "zgłoszenia"}
          </p>
          <ul className="space-y-4">
            {reports.map((report) => (
              <ProblemCard key={report.id} report={report} />
            ))}
          </ul>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}
