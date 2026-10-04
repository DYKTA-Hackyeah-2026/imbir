import type { ReactNode } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"
import { LogOut, Settings2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

function NavItem({
  to,
  icon,
  children,
}: {
  to: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}

export default function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/", { replace: true })
  }

  return (
    <header className="bg-card sticky top-0 z-10 border-b">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1.5 font-semibold">
            <Sparkles aria-hidden="true" className="text-primary size-4" />
            Małopolski Hub
          </Link>
          <nav className="ml-2 flex items-center gap-1">
            <NavItem to="/admin/cache" icon={<Settings2 aria-hidden="true" />}>
              Administracja
            </NavItem>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut aria-hidden="true" />
            Wyloguj
          </Button>
        </div>
      </div>
    </header>
  )
}
