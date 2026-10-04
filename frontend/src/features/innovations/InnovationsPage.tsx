import { useEffect, useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { FlaskConical, Library, Search, Sparkles } from "lucide-react"

import SiteHeader from "@/components/SiteHeader"
import Pagination from "@/components/Pagination"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { errorMessage } from "@/lib/api"
import {
  listInnovations,
  type EvidenceStatus,
  type InnovationListResponse,
} from "@/lib/innovations"
import { cn } from "@/lib/utils"
import { InnovationCard } from "./components/InnovationCard"

const CURRENT_YEAR = new Date().getFullYear()
const PAGE_SIZE = 9

const FILTERS: { value: EvidenceStatus | ""; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "documented", label: "Udokumentowane" },
  { value: "partially_documented", label: "Częściowo udokumentowane" },
  { value: "synthetic", label: "Demonstracyjne" },
]

export function InnovationsPage() {
  const [data, setData] = useState<InnovationListResponse | null>(null)
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [evidenceStatus, setEvidenceStatus] = useState<EvidenceStatus | "">("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    document.title = "Biblioteka innowacji – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const result = await listInnovations({
          q: submittedQuery || undefined,
          evidenceStatus: evidenceStatus || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
        if (active) setData(result)
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
  }, [submittedQuery, evidenceStatus, page, reloadKey])

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    setSubmittedQuery(query.trim())
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 py-6">
        <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              <Library aria-hidden="true" className="size-3.5" />
              Biblioteka innowacji
            </span>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Innowacje społeczne Małopolski
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
              Przeglądaj sprawdzone rozwiązania, poznaj ich źródła i zgłoś się do testów
              innowacji.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/tester"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <FlaskConical aria-hidden="true" className="size-4" />
                Testuj innowacje
              </Link>
              <Link
                to="/matchmaking"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <Sparkles aria-hidden="true" className="size-4" />
                Dopasuj do potrzeby
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex w-full max-w-md gap-2" role="search">
            <label htmlFor="innovation-search" className="sr-only">
              Szukaj innowacji
            </label>
            <Input
              id="innovation-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po nazwie, opisie lub tagu…"
              className="h-10"
            />
            <Button type="submit" variant="outline" className="h-10 shrink-0">
              <Search aria-hidden="true" />
              Szukaj
            </Button>
          </form>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtruj według dowodów">
            {FILTERS.map((filter) => {
              const active = evidenceStatus === filter.value
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => {
                    setEvidenceStatus(filter.value)
                    setPage(1)
                  }}
                  aria-pressed={active}
                  className={cn(
                    "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none",
                    active
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
                  )}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <LoadingState label="Wczytywanie innowacji…" />
          ) : error ? (
            <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
          ) : !data || data.data.length === 0 ? (
            <EmptyState message="Nie znaleziono innowacji dla podanych kryteriów." />
          ) : (
            <>
              {data.mode === "demo" ? (
                <Alert variant="demo" className="mb-4">
                  <Sparkles aria-hidden="true" />
                  <AlertTitle>Tryb demonstracyjny</AlertTitle>
                  <AlertDescription>
                    Część rekordów jest syntetyczna i służy wyłącznie do prezentacji
                    działania platformy — nie są to zweryfikowane innowacje ROPS.
                  </AlertDescription>
                </Alert>
              ) : null}

              <p className="mb-3 text-sm text-slate-500 dark:text-neutral-400">
                Znaleziono {data.total}{" "}
                {data.total === 1 ? "innowację" : "innowacji"}.
              </p>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.data.map((innovation) => (
                  <InnovationCard key={innovation.innovationId} innovation={innovation} />
                ))}
              </div>

              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </>
          )}
        </div>
      </main>

      <footer className="mt-8 border-t border-slate-200/80 py-6 dark:border-neutral-800">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 dark:text-neutral-500">
          © {CURRENT_YEAR} Małopolski Hub Innowacji Społecznych. Wszelkie prawa
          zastrzeżone.
        </p>
      </footer>
    </div>
  )
}
