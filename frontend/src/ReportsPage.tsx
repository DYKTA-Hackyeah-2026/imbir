import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"

import Pagination from "@/components/Pagination"
import ReportCard from "@/components/ReportCard"
import SiteLayout from "@/components/SiteLayout"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { ProblemReportsPanel } from "@/features/problems/ProblemReportsPanel"
import { errorMessage } from "@/lib/api"
import {
  getReports,
  type MaterialSummary,
  type PaginationMeta,
  type ReportType,
} from "@/lib/content"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12

type TabValue = ReportType | "problems"

const TABS: { value: TabValue; label: string }[] = [
  { value: "report", label: "Raporty" },
  { value: "publication", label: "Publikacje" },
  { value: "problems", label: "Zgłoszone problemy" },
]

export default function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const type = (params.get("type") as TabValue | null) ?? "report"
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  const [items, setItems] = useState<MaterialSummary[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = "Raporty i publikacje · Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    if (type === "problems") return
    const content: ReportType = type === "publication" ? "publication" : "report"

    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const res = await getReports({ type: content, page, limit: PAGE_SIZE })
        if (!active) return
        setItems(res.data)
        setMeta(res.meta)
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
  }, [type, page])

  function selectType(next: TabValue) {
    const draft = new URLSearchParams(params)
    draft.set("type", next)
    draft.delete("page")
    setParams(draft)
  }

  function setPage(next: number) {
    const draft = new URLSearchParams(params)
    draft.set("page", String(next))
    setParams(draft)
  }

  return (
    <SiteLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {type === "problems" ? "Zgłoszone problemy" : "Raporty i publikacje"}
          </h1>
          {type !== "problems" && meta ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {meta.total} {meta.total === 1 ? "pozycja" : "pozycji"}
            </p>
          ) : null}
          {type === "problems" ? (
            <p className="text-muted-foreground mt-1 text-sm">
              Problemy społeczne zgłaszane oddolnie przez mieszkańców, organizacje i
              instytucje.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => selectType(tab.value)}
                aria-pressed={type === tab.value}
                className={cn(
                  "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  type === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Link
            to="/zglos-problem"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus aria-hidden="true" className="size-4" />
            Zgłoś problem
          </Link>
        </div>
      </div>

      {type === "problems" ? (
        <ProblemReportsPanel />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState message="Brak raportów i publikacji." />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((material) => (
              <ReportCard key={material.id} material={material} />
            ))}
          </div>
          {meta ? (
            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onPage={setPage}
            />
          ) : null}
        </>
      )}
    </SiteLayout>
  )
}
