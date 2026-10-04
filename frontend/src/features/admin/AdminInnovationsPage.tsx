import { useEffect, useState, type FormEvent } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  Search,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import Pagination from "@/components/Pagination"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  listAdminSubmissions,
  updateAdminSubmission,
  type AdminSubmission,
  type AdminSubmissionList,
  type SubmissionStatus,
} from "@/lib/admin"
import { errorMessage } from "@/lib/api"
import { cn } from "@/lib/utils"
import { formatDate } from "./format"
import { SubmissionStatusBadge } from "./SubmissionStatusBadge"
import { useAdminStats } from "./adminStats"

const PAGE_SIZE = 10

const CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"

type SubmissionFilter = "" | "pending" | "accepted" | "rejected"

const FILTERS: { value: SubmissionFilter; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "pending", label: "Oczekujące" },
  { value: "accepted", label: "Zatwierdzone" },
  { value: "rejected", label: "Odrzucone" },
]

function filterParams(filter: SubmissionFilter): {
  accepted?: boolean
  status?: SubmissionStatus
} {
  if (filter === "accepted") return { accepted: true }
  if (filter === "rejected") return { status: "rejected" }
  if (filter === "pending") return { status: "submitted" }
  return {}
}

function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: number
  icon: LucideIcon
  className: string
}) {
  return (
    <div className={cn(CARD, "flex items-center gap-3 p-4")}>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold tabular-nums">{value}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-neutral-400">
          {label}
        </span>
      </span>
    </div>
  )
}

export default function AdminInnovationsPage() {
  const [searchParams] = useSearchParams()
  const urlQuery = searchParams.get("q") ?? ""

  const [queryInput, setQueryInput] = useState(urlQuery)
  const [submittedQuery, setSubmittedQuery] = useState(urlQuery)
  const [appliedUrlQuery, setAppliedUrlQuery] = useState(urlQuery)
  const [filter, setFilter] = useState<SubmissionFilter>("")
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<AdminSubmissionList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [pendingAction, setPendingAction] = useState("")
  const [actionError, setActionError] = useState<{
    id: number
    message: string
  } | null>(null)
  const { refresh: refreshStats } = useAdminStats()

  useEffect(() => {
    document.title = "Innowacje i rozwiązania – Panel administratora"
  }, [])

  if (appliedUrlQuery !== urlQuery) {
    setAppliedUrlQuery(urlQuery)
    setQueryInput(urlQuery)
    setSubmittedQuery(urlQuery)
    setPage(1)
  }

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const params = filterParams(filter)
        const data = await listAdminSubmissions({
          q: submittedQuery || undefined,
          accepted: params.accepted,
          status: params.status,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
        if (!active) return
        setResult(data)
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
  }, [submittedQuery, filter, page, reloadKey])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSubmittedQuery(queryInput.trim())
  }

  async function handleDecision(
    submission: AdminSubmission,
    decision: "accept" | "reject",
  ) {
    setPendingAction(`${submission.id}:${decision}`)
    setActionError(null)
    try {
      await updateAdminSubmission(
        submission.id,
        decision === "accept"
          ? { isAccepted: true, status: "approved" }
          : { isAccepted: false, status: "rejected" },
      )
      setReloadKey((key) => key + 1)
      refreshStats()
    } catch (caught) {
      setActionError({ id: submission.id, message: errorMessage(caught) })
    } finally {
      setPendingAction("")
    }
  }

  const counts = result?.counts ?? { pending: 0, accepted: 0, rejected: 0 }
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <nav aria-label="Ścieżka nawigacji" className="text-xs">
        <ol className="flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-neutral-400">
          <li>
            <Link
              to="/admin"
              className="hover:text-blue-700 hover:underline dark:hover:text-blue-300"
            >
              Panel administratora
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li
            aria-current="page"
            className="font-medium text-slate-700 dark:text-neutral-200"
          >
            Innowacje i rozwiązania
          </li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Innowacje i rozwiązania
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Zatwierdzaj lub odrzucaj pomysły zgłoszone przez użytkowników.
          </p>
        </div>
        <span className="text-sm text-slate-500 dark:text-neutral-400">
          {total} {total === 1 ? "zgłoszenie" : "zgłoszeń"}
        </span>
      </header>

      <section
        aria-label="Podsumowanie zgłoszeń"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Oczekujące"
          value={counts.pending}
          icon={Clock}
          className="bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300"
        />
        <StatCard
          label="Zatwierdzone"
          value={counts.accepted}
          icon={CheckCircle2}
          className="bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
        />
        <StatCard
          label="Odrzucone"
          value={counts.rejected}
          icon={XCircle}
          className="bg-red-600/10 text-red-700 dark:bg-red-400/10 dark:text-red-300"
        />
        <StatCard
          label="Wszystkie"
          value={total}
          icon={Inbox}
          className="bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
        />
      </section>

      <section
        aria-label="Filtry zgłoszeń"
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <form
          onSubmit={handleSearch}
          role="search"
          className="relative w-full sm:max-w-sm"
        >
          <label htmlFor="admin-innovations-search" className="sr-only">
            Szukaj zgłoszeń
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id="admin-innovations-search"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder="Szukaj po tytule lub autorze…"
            className="h-10 rounded-lg pl-9"
          />
        </form>

        <div className="flex items-center gap-2">
          <label
            htmlFor="admin-innovations-filter"
            className="text-sm text-slate-600 dark:text-neutral-300"
          >
            Status:
          </label>
          <select
            id="admin-innovations-filter"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as SubmissionFilter)
              setPage(1)
            }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            {FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <LoadingState label="Wczytywanie zgłoszeń…" />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => setReloadKey((key) => key + 1)}
        />
      ) : !result || result.data.length === 0 ? (
        <EmptyState message="Brak zgłoszeń dla podanych kryteriów." />
      ) : (
        <>
          <ul className="space-y-3">
            {result.data.map((submission) => {
              const acceptBusy = pendingAction === `${submission.id}:accept`
              const rejectBusy = pendingAction === `${submission.id}:reject`
              const busy = acceptBusy || rejectBusy
              const acceptDisabled =
                submission.isAccepted || submission.status === "approved"
              const rejectDisabled = submission.status === "rejected"

              return (
                <li key={submission.id} className={cn(CARD, "p-4 sm:p-5")}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">
                          {submission.title}
                        </h3>
                        <SubmissionStatusBadge submission={submission} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                        {submission.authorName ||
                          submission.authorEmail ||
                          "Nieznany autor"}{" "}
                        · {formatDate(submission.createdAt)}
                      </p>
                      {submission.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-neutral-300">
                          {submission.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busy || acceptDisabled}
                        title={
                          acceptDisabled ? "Zgłoszenie jest już zatwierdzone" : undefined
                        }
                        onClick={() => void handleDecision(submission, "accept")}
                      >
                        {acceptBusy ? (
                          <Loader2 aria-hidden="true" className="animate-spin" />
                        ) : (
                          <ThumbsUp aria-hidden="true" />
                        )}
                        Zatwierdź
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || rejectDisabled}
                        onClick={() => void handleDecision(submission, "reject")}
                      >
                        {rejectBusy ? (
                          <Loader2 aria-hidden="true" className="animate-spin" />
                        ) : (
                          <ThumbsDown aria-hidden="true" />
                        )}
                        Odrzuć
                      </Button>
                    </div>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:text-blue-300">
                      Szczegóły
                    </summary>
                    <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500 dark:text-neutral-400">
                          Autor
                        </dt>
                        <dd className="font-medium">
                          {submission.authorName || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-neutral-400">
                          E-mail
                        </dt>
                        <dd className="font-medium">
                          {submission.authorEmail || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-neutral-400">
                          Etap kreatora
                        </dt>
                        <dd className="font-medium">{submission.currentStep}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500 dark:text-neutral-400">
                          Ostatnia aktualizacja
                        </dt>
                        <dd className="font-medium">
                          {formatDate(submission.updatedAt) || "—"}
                        </dd>
                      </div>
                    </dl>
                    {submission.description ? (
                      <p className="mt-3 text-sm whitespace-pre-line text-slate-600 dark:text-neutral-300">
                        {submission.description}
                      </p>
                    ) : null}
                  </details>

                  {actionError?.id === submission.id ? (
                    <p
                      role="alert"
                      className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                    >
                      {actionError.message}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}
