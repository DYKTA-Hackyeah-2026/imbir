import { useEffect, useState, type FormEvent } from "react"
import { useSearchParams } from "react-router-dom"
import { Search } from "lucide-react"

import MaterialCard from "@/components/MaterialCard"
import Pagination from "@/components/Pagination"
import SiteLayout from "@/components/SiteLayout"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api"
import { searchContent, type SearchResult } from "@/lib/content"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 12

function FacetChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
      )}
    >
      {label}
      <span className={cn("text-xs", active ? "opacity-80" : "text-muted-foreground")}>
        {count}
      </span>
    </button>
  )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q") ?? ""
  const type = params.get("type") ?? ""
  const category = params.get("category") ?? ""
  const topic = params.get("topic") ?? ""
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)

  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    document.title = q
      ? `Szukaj: ${q} · Małopolski Hub Innowacji Społecznych`
      : "Szukaj · Małopolski Hub Innowacji Społecznych"
  }, [q])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const res = await searchContent({
          q,
          type: type || undefined,
          category: category || undefined,
          topic: topic || undefined,
          page,
          limit: PAGE_SIZE,
        })
        if (active) setResult(res)
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
  }, [q, type, category, topic, page])

  function update(patch: Record<string, string | number | undefined>) {
    const draft = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") draft.delete(key)
      else draft.set(key, String(value))
    }
    setParams(draft)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = String(
      new FormData(event.currentTarget).get("q") ?? "",
    ).trim()
    update({ q: value, page: 1 })
  }

  function toggleType(slug: string) {
    const set = new Set(type.split(",").filter(Boolean))
    if (set.has(slug)) set.delete(slug)
    else set.add(slug)
    update({ type: [...set].join(","), page: 1 })
  }

  const activeTypes = new Set(type.split(",").filter(Boolean))
  const facets = result?.facets

  return (
    <SiteLayout>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        {q ? `Wyniki wyszukiwania` : "Wyszukiwarka"}
      </h1>
      {q ? (
        <p className="text-muted-foreground mt-1 text-sm">
          Dla frazy{" "}
          <span className="text-foreground font-medium">„{q}”</span>
          {result ? ` — ${result.meta.total} wyników` : ""}
        </p>
      ) : (
        <p className="text-muted-foreground mt-1 text-sm">
          Wpisz frazę, aby przeszukać bazę wiedzy.
        </p>
      )}

      <form onSubmit={handleSubmit} role="search" className="mt-4 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
          />
          <input
            key={q}
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Szukaj materiałów…"
            aria-label="Szukaj materiałów"
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <Button type="submit" className="h-10 shrink-0">
          Szukaj
        </Button>
      </form>

      {facets ? (
        <div className="mt-5 space-y-3">
          {facets.types.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Typ
              </span>
              {facets.types.map((facet) => (
                <FacetChip
                  key={facet.slug}
                  active={activeTypes.has(facet.slug)}
                  label={facet.name}
                  count={facet.count}
                  onClick={() => toggleType(facet.slug)}
                />
              ))}
            </div>
          ) : null}
          {facets.topics.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Temat
              </span>
              {facets.topics.map((facet) => (
                <FacetChip
                  key={facet.slug}
                  active={topic === facet.slug}
                  label={facet.name}
                  count={facet.count}
                  onClick={() =>
                    update({
                      topic: topic === facet.slug ? undefined : facet.slug,
                      page: 1,
                    })
                  }
                />
              ))}
            </div>
          ) : null}
          {facets.categories.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Kategoria
              </span>
              {facets.categories.map((facet) => (
                <FacetChip
                  key={facet.slug}
                  active={category === facet.slug}
                  label={facet.name}
                  count={facet.count}
                  onClick={() =>
                    update({
                      category: category === facet.slug ? undefined : facet.slug,
                      page: 1,
                    })
                  }
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        {loading ? (
          <LoadingState label="Szukanie…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : !result || result.data.length === 0 ? (
          <EmptyState
            message={
              q
                ? "Brak wyników. Spróbuj innej frazy lub usuń filtry."
                : "Wpisz frazę, aby rozpocząć wyszukiwanie."
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
            <Pagination
              page={result.meta.page}
              totalPages={result.meta.totalPages}
              onPage={(next) => update({ page: next })}
            />
          </>
        )}
      </div>
    </SiteLayout>
  )
}
