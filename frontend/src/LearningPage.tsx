import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"

import MaterialCard from "@/components/MaterialCard"
import Pagination from "@/components/Pagination"
import SiteLayout from "@/components/SiteLayout"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { errorMessage } from "@/lib/api"
import {
  getLearning,
  type LearningType,
  type MaterialSummary,
  type PaginationMeta,
} from "@/lib/content"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12

const TABS: { value: LearningType | ""; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "guide", label: "Poradniki" },
  { value: "webinar", label: "Webinary" },
  { value: "checklist", label: "Listy kontrolne" },
]

export default function LearningPage() {
  const [params, setParams] = useSearchParams()
  const type = (params.get("type") as LearningType | null) ?? ""
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  const [items, setItems] = useState<MaterialSummary[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = "Ucz się i działaj · Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const res = await getLearning({ type: type || undefined, page, limit: PAGE_SIZE })
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

  function selectType(next: string) {
    const draft = new URLSearchParams(params)
    if (next) draft.set("type", next)
    else draft.delete("type")
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ucz się i działaj
          </h1>
          {meta ? (
            <p role="status" className="text-muted-foreground mt-1 text-sm">
              {meta.total} {meta.total === 1 ? "materiał" : "materiałów"}
            </p>
          ) : null}
        </div>
        <div role="group" aria-label="Typ materiałów edukacyjnych" className="bg-muted flex flex-wrap items-center gap-1 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => selectType(tab.value)}
              aria-pressed={type === tab.value}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                type === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState message="Brak materiałów edukacyjnych." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((material) => (
              <MaterialCard key={material.id} material={material} />
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
