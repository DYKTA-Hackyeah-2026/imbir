import { createContext, useContext } from "react"

import type { AdminStats } from "@/lib/admin"

export type AdminStatsContextValue = {
  stats: AdminStats | null
  loading: boolean
  error: string
  refresh: () => void
}

export const AdminStatsContext = createContext<AdminStatsContextValue | null>(null)

export function useAdminStats(): AdminStatsContextValue {
  const context = useContext(AdminStatsContext)
  if (!context) {
    throw new Error("useAdminStats must be used within an AdminStatsProvider")
  }
  return context
}
