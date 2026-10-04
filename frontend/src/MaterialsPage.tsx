import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ArrowRight, BookOpen, Lightbulb, Search, X } from "lucide-react"

import MaterialCard from "@/components/MaterialCard"
import Pagination from "@/components/Pagination"
import SiteLayout from "@/components/SiteLayout"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { Button } from "@/components/ui/button"
import { errorMessage } from "@/lib/api"
import {
  getCategories,
  getMaterials,
  getTopics,
  type MaterialSummary,
  type PaginationMeta,
  type SortOrder,
} from "@/lib/content"

const PAGE_SIZE = 12

export default function MaterialsPage() {
  const { category, topic } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState("")

  const page = Math.max(1, Number(params.get("page") ?? "1") || 1)
  const sort = (params.get("sort") as SortOrder | null) ?? "-publishedAt"
  const type = params.get("type") ?? undefined
  const featured = params.get("featured") === "true" ? true : undefined

  const [items, setItems] = useState<MaterialSummary[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [names, setNames] = useState<{
    categories: Record<string, string>
    topics: Record<string, string>
  }>({ categories: {}, topics: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([getCategories(), getTopics()])
      .then(([categories, topics]) => {
        if (!active) return
        setNames({
          categories: Object.fromEntries(categories.map((c) => [c.slug, c.name])),
          topics: Object.fromEntries(topics.map((t) => [t.slug, t.name])),
        })
      })
      .catch(() => {
        /* taxonomy names are optional */
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const res = await getMaterials({
          category,
          topic,
          type,
          featured,
          sort,
          page,
          limit: PAGE_SIZE,
        })
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
  }, [category, topic, type, featured, sort, page])

  function setPage(next: number) {
    const draft = new URLSearchParams(params)
    draft.set("page", String(next))
    setParams(draft)
  }

  function setSort(value: string) {
    const draft = new URLSearchParams(params)
    draft.set("sort", value)
    draft.delete("page")
    setParams(draft)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/szukaj?q=${encodeURIComponent(trimmed)}` : "/szukaj")
  }

  const isFiltered = Boolean(category || topic || type || featured)
  const showHero = !category && !topic

  let title = "Wszystkie materiały"
  if (category) title = names.categories[category] ?? "Kategoria"
  else if (topic) title = names.topics[topic] ?? "Temat"
  else if (featured) title = "Polecane innowacje"

  let subtitle: string | null = null
  if (category) subtitle = "Kategoria"
  else if (topic) subtitle = "Temat"

  useEffect(() => {
    document.title = `${showHero ? "Baza wiedzy" : title} · Małopolski Hub Innowacji Społecznych`
  }, [showHero, title])

  return (
    <SiteLayout>
      {showHero ? (
        <section className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Baza wiedzy
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
              Znajdź innowacje społeczne, raporty, publikacje, materiały
              edukacyjne i inspiracje do działania.
            </p>
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-6 flex max-w-xl gap-2"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Szukaj innowacji, raportów, materiałów..."
                  aria-label="Szukaj w bazie wiedzy"
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-sm outline-none focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:border-neutral-700 dark:bg-neutral-900"
                />
              </div>
              <Button type="submit" className="h-11 shrink-0 gap-2 px-4">
                Szukaj
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            </form>
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 items-center justify-center lg:flex">
            <div className="relative h-52 w-72">
              <p className="absolute top-0 right-10 -rotate-6 text-right text-sm leading-tight font-bold text-blue-600 [font-family:cursive]">
                Wiedza
                <br />
                Inspiruje
                <br />
                Działanie
              </p>
              <div className="absolute right-16 bottom-4 flex size-20 items-center justify-center rounded-full bg-blue-500/10">
                <BookOpen aria-hidden="true" className="size-10 text-blue-600" />
              </div>
              <div className="absolute right-4 bottom-4 flex items-end gap-1.5">
                <span className="h-16 w-5 rounded-t-md bg-amber-300" />
                <span className="h-20 w-5 rounded-t-md bg-blue-300" />
                <span className="h-12 w-5 rounded-t-md bg-emerald-300" />
              </div>
              <div className="absolute right-4 bottom-24 flex size-12 items-center justify-center rounded-full bg-amber-400/20">
                <Lightbulb
                  aria-hidden="true"
                  className="size-6 text-amber-500"
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {subtitle ? (
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {subtitle}
            </p>
          ) : null}
          {showHero ? (
            <h2 className="text-xl font-bold tracking-tight">
              Wszystkie materiały
            </h2>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
          )}
          {meta ? (
            <p role="status" className="text-muted-foreground mt-1 text-sm">
              {meta.total} {meta.total === 1 ? "materiał" : "materiałów"}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-muted-foreground text-sm">
            Sortuj:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
          >
            <option value="-publishedAt">Najnowsze</option>
            <option value="publishedAt">Najstarsze</option>
            <option value="title">Tytuł A–Z</option>
          </select>
          {isFiltered ? (
            <Link
              to="/materialy"
              className="text-muted-foreground inline-flex items-center gap-1 text-sm hover:text-blue-600"
            >
              <X aria-hidden="true" className="size-4" />
              Wyczyść filtry
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : items.length === 0 ? (
        <EmptyState message="Nie znaleziono materiałów dla wybranych filtrów." />
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
