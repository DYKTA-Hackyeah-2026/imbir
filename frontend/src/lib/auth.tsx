import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Navigate, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"

import * as api from "./api"

type AuthStatus = "loading" | "authenticated" | "anonymous"

type AuthContextValue = {
  user: api.User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(
    api.hasStoredSession() ? "loading" : "anonymous",
  )

  useEffect(() => {
    if (!api.hasStoredSession()) return
    let active = true

    api
      .restoreSession()
      .then((restored) => {
        if (!active) return
        setUser(restored)
        setStatus(restored ? "authenticated" : "anonymous")
      })
      .catch(() => {
        if (!active) return
        setStatus("anonymous")
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password)
    setUser(session.user)
    setStatus("authenticated")
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const session = await api.register(name, email, password)
      setUser(session.user)
      setStatus("authenticated")
    },
    [],
  )

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    setStatus("anonymous")
  }, [])

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

function AuthLoading() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <Loader2
        aria-hidden="true"
        className="text-muted-foreground size-5 animate-spin"
      />
      <span className="sr-only">Ładowanie</span>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return <AuthLoading />
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === "loading") {
    return <AuthLoading />
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!user?.isAdmin && user?.role !== "admin") {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
