import { Link, NavLink, useNavigate } from "react-router-dom"
import { LogIn, LogOut, Menu, Moon, Sun } from "lucide-react"

import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/useTheme"
import { cn } from "@/lib/utils"

const NAV = [
  { label: "Strona główna", to: "/", end: true },
  { label: "Kreator pomysłów", to: "/kreator" },
  { label: "Tester innowacji", to: "/tester" },
  { label: "Asystent AI", to: "/chat" },
  { label: "Baza wiedzy", to: "/materialy" },
  { label: "Raporty", to: "/raporty" },
  { label: "Nauka", to: "/nauka" },
  { label: "Granty", to: "/granty" },
  { label: "Kontakt", to: "/kontakt" },
]

const BLUE_BUTTON =
  "inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"

export default function SiteHeader({ compact = false }: { compact?: boolean }) {
  const { dark, toggle } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-base font-black text-white">
            M
          </span>
          <span className="text-[0.7rem] leading-tight font-bold sm:text-sm">
            Małopolski Hub
            <br />
            Innowacji Społecznych
          </span>
        </Link>

        {!compact ? (
          <nav className="hidden min-w-0 items-center gap-0.5 overflow-x-auto lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 border-b-2 px-2.5 py-2 text-[0.8rem] font-medium whitespace-nowrap transition-colors",
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-600 hover:text-blue-600 dark:text-neutral-300 dark:hover:text-blue-400",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : (
          <span className="text-muted-foreground hidden text-sm sm:block">
            Baza wiedzy o innowacjach społecznych
          </span>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? "Włącz jasny motyw" : "Włącz ciemny motyw"}
            className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-blue-400"
          >
            {dark ? (
              <Sun aria-hidden="true" className="size-4" />
            ) : (
              <Moon aria-hidden="true" className="size-4" />
            )}
          </button>

          {!compact ? (
            user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm text-slate-600 xl:inline dark:text-neutral-300">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={BLUE_BUTTON}
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Wyloguj
                </button>
              </>
            ) : (
              <Link to="/login" className={BLUE_BUTTON}>
                <LogIn aria-hidden="true" className="size-4" />
                Zaloguj się
              </Link>
            )
          ) : null}

          {!compact ? (
            <button
              type="button"
              aria-label="Menu"
              className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 lg:hidden dark:border-neutral-700 dark:text-neutral-300"
            >
              <Menu aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
