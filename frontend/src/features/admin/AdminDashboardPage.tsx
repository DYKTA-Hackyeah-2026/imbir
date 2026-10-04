import { useEffect } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  BookPlus,
  ClipboardList,
  FlaskConical,
  Inbox,
  Lightbulb,
  PenLine,
  Send,
  Users,
  type LucideIcon,
} from "lucide-react"

import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import type { AdminStats } from "@/lib/admin"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { formatDate, formatRelative, formatShortDate, formatStatus } from "./format"
import { SubmissionStatusBadge } from "./SubmissionStatusBadge"
import { useAdminStats } from "./adminStats"

const CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"

type ActivityItem = AdminStats["recentActivity"][number]

const ACTIVITY_META: Record<
  ActivityItem["type"],
  { icon: LucideIcon; className: string }
> = {
  submission: {
    icon: Lightbulb,
    className: "bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  },
  report: {
    icon: Inbox,
    className:
      "bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
  },
  application: {
    icon: ClipboardList,
    className:
      "bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  },
  test: {
    icon: FlaskConical,
    className:
      "bg-violet-600/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300",
  },
}

function StatCard({
  to,
  icon: Icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: number
  hint?: string
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        CARD,
        "group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
        highlight &&
          "border-blue-300 bg-blue-50/60 ring-1 ring-blue-200 dark:border-blue-500/40 dark:bg-blue-500/10 dark:ring-blue-500/30",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl",
            highlight
              ? "bg-blue-600 text-white"
              : "bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
          )}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400"
        />
      </span>
      <span>
        <span className="block text-2xl font-bold tabular-nums">{value}</span>
        <span className="block text-sm font-medium text-slate-700 dark:text-neutral-200">
          {label}
        </span>
        {hint ? (
          <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">
            {hint}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

function ActivityChart({ data }: { data: AdminStats["activityByDay"] }) {
  const width = 640
  const height = 220
  const padding = { top: 16, right: 12, bottom: 30, left: 36 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  const submissionTotal = data.reduce((sum, day) => sum + day.submissions, 0)
  const reportTotal = data.reduce((sum, day) => sum + day.reports, 0)

  if (data.length === 0 || submissionTotal + reportTotal === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-neutral-400">
        Brak aktywności w ostatnich 14 dniach.
      </p>
    )
  }

  const max = Math.max(1, ...data.flatMap((day) => [day.submissions, day.reports]))
  const stepX = data.length > 1 ? innerWidth / (data.length - 1) : 0
  const xAt = (index: number) => padding.left + index * stepX
  const yAt = (value: number) => padding.top + innerHeight - (value / max) * innerHeight
  const points = (key: "submissions" | "reports") =>
    data
      .map((day, index) => `${xAt(index).toFixed(1)},${yAt(day[key]).toFixed(1)}`)
      .join(" ")

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label={`Aktywność z ostatnich 14 dni. Zgłoszenia innowacji: ${submissionTotal}, zgłoszenia problemów: ${reportTotal}.`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + innerHeight * (1 - ratio)
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="stroke-slate-200 dark:stroke-neutral-800"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] dark:fill-neutral-500"
              >
                {Math.round(max * ratio)}
              </text>
            </g>
          )
        })}

        <polyline
          points={points("submissions")}
          fill="none"
          className="stroke-blue-600 dark:stroke-blue-400"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={points("reports")}
          fill="none"
          className="stroke-amber-500 dark:stroke-amber-400"
          strokeWidth="2.5"
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {data.map((day, index) => (
          <g key={day.date}>
            <circle
              cx={xAt(index)}
              cy={yAt(day.submissions)}
              r="3"
              className="fill-blue-600 dark:fill-blue-400"
            />
            <circle
              cx={xAt(index)}
              cy={yAt(day.reports)}
              r="3"
              className="fill-amber-500 dark:fill-amber-400"
            />
            {index % 3 === 0 ? (
              <text
                x={xAt(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] dark:fill-neutral-500"
              >
                {formatShortDate(day.date)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer">Dane wykresu</summary>
        <ul className="mt-2 space-y-1">
          {data.map((day) => (
            <li key={day.date}>
              {formatDate(day.date)}: innowacje {day.submissions}, problemy {day.reports}.
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />
          Zgłoszenia innowacji
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500 dark:bg-amber-400" />
          Zgłoszenia problemów
        </span>
      </div>
    </div>
  )
}

function QuickAction({
  to,
  icon: Icon,
  label,
  description,
  highlight = false,
}: {
  to: string
  icon: LucideIcon
  label: string
  description: string
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        CARD,
        "group flex flex-col gap-2 p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
        highlight &&
          "border-blue-600 bg-blue-600 text-white dark:border-blue-600 dark:bg-blue-600",
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          highlight
            ? "bg-white/15 text-white"
            : "bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span
        className={cn(
          "text-xs",
          highlight ? "text-blue-100" : "text-slate-500 dark:text-neutral-400",
        )}
      >
        {description}
      </span>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { stats, loading, error, refresh } = useAdminStats()

  useEffect(() => {
    document.title = "Panel administratora – Małopolski Hub Innowacji Społecznych"
  }, [])

  if (loading && !stats) {
    return <LoadingState label="Wczytywanie statystyk…" />
  }

  if (error && !stats) {
    return <ErrorState message={error} onRetry={refresh} />
  }

  if (!stats) {
    return <EmptyState message="Brak danych statystycznych." />
  }

  const categoriesMax = Math.max(
    1,
    ...stats.categories.map((category) => category.count),
  )

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Witaj!</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Zalogowano jako{" "}
          <span className="font-medium text-slate-800 dark:text-neutral-200">
            {user?.email}
          </span>
          . Oto co dzieje się w platformie.
        </p>
      </header>

      <section
        aria-label="Najważniejsze statystyki"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          to="/raporty?type=problems"
          icon={Inbox}
          label="Nowe zgłoszenia problemów"
          value={stats.problemReports.new}
          hint={`+${stats.problemReports.newThisWeek} w tym tygodniu`}
        />
        <StatCard
          to="/admin/innowacje"
          icon={Lightbulb}
          label="Innowacje oczekujące"
          value={stats.submissions.pending}
          hint="Przejdź do zatwierdzania"
          highlight
        />
        <StatCard
          to="/innowacje"
          icon={BookPlus}
          label="Innowacje w bazie"
          value={stats.innovations.catalogue}
          hint="Pozycje w bibliotece innowacji"
        />
        <StatCard
          to="/admin"
          icon={Users}
          label="Użytkownicy"
          value={stats.users.total}
          hint={`+${stats.users.newThisWeek} w tym tygodniu`}
        />
      </section>

      <section className={cn(CARD, "p-5")} aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-lg font-bold">
          Aktywność (ostatnie 14 dni)
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-neutral-400">
          Nowe zgłoszenia innowacji i problemów w czasie.
        </p>
        <ActivityChart data={stats.activityByDay} />
      </section>

      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-3 text-lg font-bold">
          Szybkie akcje
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <QuickAction
            to="/raporty?type=problems"
            icon={Inbox}
            label="Przeglądaj zgłoszenia"
            description="Problemy zgłoszone przez mieszkańców"
          />
          <QuickAction
            to="/admin/innowacje"
            icon={Lightbulb}
            label="Zarządzaj innowacjami"
            description="Zatwierdź lub odrzuć zgłoszone pomysły"
            highlight
          />
          <QuickAction
            to="/materialy"
            icon={BookPlus}
            label="Dodaj wiedzę"
            description="Materiały i publikacje w bazie"
          />
          <QuickAction
            to="/kreator"
            icon={PenLine}
            label="Utwórz nowy pomysł"
            description="Otwórz kreator innowacji"
          />
          <QuickAction
            to="/kontakt"
            icon={Send}
            label="Wyślij komunikat"
            description="Skontaktuj się z użytkownikami"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          className={cn(CARD, "p-5 lg:col-span-2")}
          aria-labelledby="recent-submissions-heading"
        >
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="recent-submissions-heading" className="text-lg font-bold">
              Ostatnie zgłoszenia
            </h2>
            <Link
              to="/admin/innowacje"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline dark:text-blue-300"
            >
              Zobacz wszystkie
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>

          {stats.recentSubmissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-neutral-400">
              Brak ostatnich zgłoszeń.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {stats.recentSubmissions.map((submission) => (
                <li key={submission.id}>
                  <Link
                    to="/admin/innowacje"
                    className="flex items-start justify-between gap-3 py-3 transition-colors hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {submission.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-neutral-400">
                        {submission.authorEmail ?? "Nieznany autor"} ·{" "}
                        {formatDate(submission.createdAt)}
                      </span>
                    </span>
                    <SubmissionStatusBadge submission={submission} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={cn(CARD, "p-5")} aria-labelledby="categories-heading">
            <h2 id="categories-heading" className="text-lg font-bold">
              Najpopularniejsze kategorie
            </h2>
            {stats.categories.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                Brak danych o kategoriach.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {stats.categories.slice(0, 8).map((category) => (
                  <li key={category.category}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-slate-700 dark:text-neutral-200">
                        {category.category}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums dark:text-neutral-400">
                        {category.count}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-neutral-800">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{
                          width: `${Math.round((category.count / categoriesMax) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cn(CARD, "p-5")} aria-labelledby="recent-activity-heading">
            <h2 id="recent-activity-heading" className="text-lg font-bold">
              Ostatnia aktywność
            </h2>
            {stats.recentActivity.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                Brak ostatniej aktywności.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {stats.recentActivity.slice(0, 8).map((item, index) => {
                  const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.submission
                  const Icon = meta.icon
                  return (
                    <li key={`${item.type}-${index}`} className="flex gap-3">
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          meta.className,
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="block text-xs text-slate-500 dark:text-neutral-400">
                          {formatRelative(item.at)}
                          {item.status ? ` · ${formatStatus(item.status)}` : ""}
                        </span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
