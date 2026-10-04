import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Bell,
  BookOpen,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MessageSquare,
  Moon,
  PenLine,
  Search,
  Settings,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAdminStats, type AdminStats } from "@/lib/admin"
import { errorMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/useTheme"
import { cn } from "@/lib/utils"
import {
  AdminStatsContext,
  useAdminStats,
  type AdminStatsContextValue,
} from "./adminStats"

type SidebarItem = {
  label: string
  to?: string
  icon: LucideIcon
  end?: boolean
  badge?: "reports" | "submissions"
  disabled?: boolean
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  {
    label: "Zgłoszenia i potrzeby",
    to: "/raporty?type=problems",
    icon: Inbox,
    badge: "reports",
  },
  {
    label: "Innowacje i rozwiązania",
    to: "/admin/innowacje",
    icon: Lightbulb,
    badge: "submissions",
  },
  { label: "Użytkownicy", icon: Users, disabled: true },
  { label: "Wiedza i zasoby", to: "/materialy", icon: BookOpen },
  { label: "Kreator pomysłów", to: "/kreator", icon: PenLine },
  { label: "Testy i wdrożenia", to: "/tester", icon: FlaskConical },
  { label: "Komunikacja", to: "/kontakt", icon: MessageSquare },
  { label: "Raporty i analizy", to: "/raporty", icon: BarChart3 },
  { label: "Ustawienia", to: "/admin/cache", icon: Settings },
]

export function AdminStatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const result = await getAdminStats()
        if (!active) return
        setStats(result)
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

  const refresh = useCallback(() => setReloadKey((key) => key + 1), [])

  const value = useMemo<AdminStatsContextValue>(
    () => ({ stats, loading, error, refresh }),
    [stats, loading, error, refresh],
  )

  return (
    <AdminStatsContext.Provider value={value}>{children}</AdminStatsContext.Provider>
  )
}

function SidebarNav({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal"
}) {
  const { stats } = useAdminStats()
  const horizontal = orientation === "horizontal"

  return (
    <nav
      aria-label="Nawigacja panelu administratora"
      className={cn(
        horizontal
          ? "flex gap-2 overflow-x-auto px-4 py-3"
          : "flex flex-1 flex-col gap-1 overflow-y-auto p-3",
      )}
    >
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon
        const badge =
          item.badge === "reports"
            ? (stats?.problemReports.new ?? 0)
            : item.badge === "submissions"
              ? (stats?.submissions.pending ?? 0)
              : 0

        if (item.disabled || !item.to) {
          return (
            <span
              key={item.label}
              aria-disabled="true"
              title="Wkrótce"
              className={cn(
                "flex cursor-not-allowed items-center gap-2.5 rounded-lg text-sm font-medium text-slate-400 dark:text-neutral-600",
                horizontal ? "shrink-0 px-3 py-2" : "px-3 py-2",
              )}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
                wkrótce
              </span>
            </span>
          )
        }

        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none",
                horizontal ? "shrink-0 px-3 py-2" : "px-3 py-2",
                isActive
                  ? "bg-blue-600/10 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white",
              )
            }
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
            {badge > 0 ? (
              <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )
}

function AdminBrand() {
  return (
    <Link
      to="/admin"
      className="flex items-center gap-2.5 border-b border-slate-200/80 px-4 py-4 dark:border-neutral-800"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-base font-black text-white">
        M
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">Małopolski Hub</span>
        <span className="block truncate text-[0.7rem] font-medium text-slate-500 dark:text-neutral-400">
          Panel administratora
        </span>
      </span>
    </Link>
  )
}

function AdminTopBar() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const { stats } = useAdminStats()
  const navigate = useNavigate()
  const [query, setQuery] = useState("")

  const alerts =
    (stats?.submissions.pending ?? 0) + (stats?.problemReports.new ?? 0)

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const value = query.trim()
    navigate(
      value ? `/admin/innowacje?q=${encodeURIComponent(value)}` : "/admin/innowacje",
    )
  }

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-2">
        <Link
          to="/admin"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-base font-black text-white lg:hidden"
        >
          M<span className="sr-only">Panel administratora</span>
        </Link>

        <form
          onSubmit={handleSearch}
          role="search"
          className="relative w-full max-w-md"
        >
          <label htmlFor="admin-search" className="sr-only">
            Szukaj zgłoszeń
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            id="admin-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj zgłoszeń…"
            className="h-10 rounded-lg pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/admin/innowacje"
            aria-label={
              alerts > 0
                ? `Powiadomienia: ${alerts} oczekujących`
                : "Powiadomienia"
            }
            title={
              alerts > 0 ? `${alerts} elementów wymaga uwagi` : "Brak powiadomień"
            }
            className="relative flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-blue-400"
          >
            <Bell aria-hidden="true" className="size-4" />
            {alerts > 0 ? (
              <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[0.65rem] font-bold text-white">
                {alerts > 99 ? "99+" : alerts}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
            className="flex size-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-blue-400"
          >
            {dark ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </button>

          <div className="hidden min-w-0 flex-col text-right sm:flex">
            <span className="max-w-40 truncate text-sm font-medium">
              {user?.email}
            </span>
            <span className="text-xs text-slate-500 dark:text-neutral-400">
              Administrator
            </span>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            Wyloguj
          </Button>
        </div>
      </div>
    </header>
  )
}

export default function AdminLayout() {
  return (
    <AdminStatsProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
          <AdminBrand />
          <SidebarNav />
          <p className="border-t border-slate-200/80 px-4 py-3 text-[0.7rem] text-slate-400 dark:border-neutral-800 dark:text-neutral-500">
            Strefa administratora
          </p>
        </aside>

        <div className="lg:pl-64">
          <AdminTopBar />
          <div className="border-b border-slate-200/80 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:hidden">
            <SidebarNav orientation="horizontal" />
          </div>
          <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminStatsProvider>
  )
}
