import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Library,
  Mail,
  MessageSquareQuote,
  Search,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react"

import SiteHeader from "@/components/SiteHeader"
import Pagination from "@/components/Pagination"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { errorMessage } from "@/lib/api"
import {
  listCatalogueInnovations,
  listCatalogueInnovationsPage,
  listTests,
  type CatalogueSummary,
  type InnovationTest,
  type TestStatus,
} from "@/lib/tester"
import { cn } from "@/lib/utils"
import { CreateTestForm } from "./components/CreateTestForm"
import { InnovationCard } from "./components/InnovationCard"
import { TestCard } from "./components/TestCard"

const CURRENT_YEAR = new Date().getFullYear()
const PAGE_SIZE = 6
const CATALOGUE_PAGE_SIZE = 6

const CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"

const FILTERS: { value: TestStatus | ""; label: string }[] = [
  { value: "", label: "Wszystkie testy" },
  { value: "recruiting", label: "Nabór otwarty" },
  { value: "active", label: "W trakcie" },
  { value: "completed", label: "Zakończone" },
]

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: "Wybierz test",
    description: "Przejrzyj testy innowacji i sprawdź, czego dotyczą.",
  },
  {
    icon: ClipboardList,
    title: "Zgłoś udział",
    description: "Wypełnij krótki formularz i opisz swoją motywację.",
  },
  {
    icon: Wrench,
    title: "Testuj i oceniaj",
    description: "Przekaż opinię, wskaż problemy i zaproponuj usprawnienia.",
  },
]

export function TesterPage() {
  const [tests, setTests] = useState<InnovationTest[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<TestStatus | "">("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [catalogueTitles, setCatalogueTitles] = useState<Record<string, string>>({})

  const [catalogue, setCatalogue] = useState<CatalogueSummary[]>([])
  const [catalogueTotal, setCatalogueTotal] = useState(0)
  const [cataloguePage, setCataloguePage] = useState(1)
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [catalogueError, setCatalogueError] = useState("")

  useEffect(() => {
    document.title = "Tester innowacji – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    let active = true
    listCatalogueInnovations()
      .then((items) => {
        if (!active) return
        setCatalogueTitles(
          Object.fromEntries(items.map((item) => [item.innovationId, item.title])),
        )
      })
      .catch(() => {
        /* nazwy innowacji są opcjonalnym wzbogaceniem listy */
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
        const result = await listTests({
          status: status || undefined,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        })
        if (!active) return
        setTests(result.data)
        setTotal(result.total)
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
  }, [status, page, reloadKey])

  useEffect(() => {
    let active = true
    async function run() {
      setCatalogueLoading(true)
      setCatalogueError("")
      try {
        const result = await listCatalogueInnovationsPage({
          limit: CATALOGUE_PAGE_SIZE,
          offset: (cataloguePage - 1) * CATALOGUE_PAGE_SIZE,
        })
        if (!active) return
        setCatalogue(result.data)
        setCatalogueTotal(result.total)
      } catch (caught) {
        if (active) setCatalogueError(errorMessage(caught))
      } finally {
        if (active) setCatalogueLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [cataloguePage, reloadKey])

  const handleCreated = useCallback(() => {
    setStatus("")
    setPage(1)
    setReloadKey((key) => key + 1)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-6">
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <FlaskConical aria-hidden="true" className="size-3.5" />
                Moduł testera
              </span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Testuj innowacje społeczne
              </h1>
              <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
                Zgłoś chęć udziału w testach, oceń istniejące rozwiązania i przekaż
                informację zwrotną. Twoja opinia pomaga rozwijać innowacje w Małopolsce.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/tester/moje"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <ClipboardList aria-hidden="true" className="size-4" />
                  Moje zgłoszenia
                </Link>
                <Link
                  to="/innowacje"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <Library aria-hidden="true" className="size-4" />
                  Biblioteka innowacji
                </Link>
                <Link
                  to="/matchmaking"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <Sparkles aria-hidden="true" className="size-4" />
                  Dopasuj rozwiązanie do potrzeby
                </Link>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 hidden w-72 items-center justify-center lg:flex"
            >
              <div className="relative h-40 w-56">
                <span className="absolute top-2 right-16 flex size-20 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg">
                  <FlaskConical className="size-10" />
                </span>
                <span className="absolute bottom-4 left-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="size-7" />
                </span>
                <span className="absolute right-0 bottom-0 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  <MessageSquareQuote className="size-6" />
                </span>
              </div>
            </div>
          </section>

          <section aria-labelledby="tests-heading">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="tests-heading" className="text-xl font-bold">
                Aktywne testy
              </h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filtruj testy według statusu">
                {FILTERS.map((filter) => {
                  const active = status === filter.value
                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() => {
                        setStatus(filter.value)
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

            {loading ? (
              <LoadingState label="Wczytywanie testów…" />
            ) : error ? (
              <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
            ) : tests.length === 0 ? (
              <EmptyState message="Nie znaleziono testów dla wybranego filtra." />
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {tests.map((test) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      innovationTitle={catalogueTitles[test.innovationId]}
                    />
                  ))}
                </div>
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </>
            )}
          </section>

          <section aria-labelledby="catalogue-heading">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="catalogue-heading" className="text-xl font-bold">
                  Katalog innowacji
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  Innowacje społeczne z bazy wiedzy — wybierz rozwiązanie, które
                  chcesz przetestować.
                </p>
              </div>
              {catalogueTotal > 0 ? (
                <span className="text-muted-foreground text-sm">
                  {catalogueTotal} {catalogueTotal === 1 ? "pozycja" : "pozycji"}
                </span>
              ) : null}
            </div>

            {catalogueLoading ? (
              <LoadingState label="Wczytywanie katalogu innowacji…" />
            ) : catalogueError ? (
              <ErrorState
                message={catalogueError}
                onRetry={() => setReloadKey((key) => key + 1)}
              />
            ) : catalogue.length === 0 ? (
              <EmptyState message="Katalog innowacji jest pusty." />
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {catalogue.map((innovation) => (
                    <InnovationCard
                      key={innovation.innovationId}
                      innovation={innovation}
                    />
                  ))}
                </div>
                <Pagination
                  page={cataloguePage}
                  totalPages={Math.max(
                    1,
                    Math.ceil(catalogueTotal / CATALOGUE_PAGE_SIZE),
                  )}
                  onPage={setCataloguePage}
                />
              </>
            )}
          </section>

          <section className={`${CARD} p-5`} aria-labelledby="organizer-heading">
            <details>
              <summary className="cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
                <span className="inline-flex items-center gap-2 text-lg font-bold">
                  <UsersRound aria-hidden="true" className="size-5 text-blue-600 dark:text-blue-400" />
                  <span id="organizer-heading">Ogłoś nabór testerów (panel organizatora)</span>
                </span>
                <span className="mt-1 block text-sm text-slate-500 dark:text-neutral-400">
                  Dodaj nowy test innowacji, aby testerzy mogli się zgłaszać.
                </span>
              </summary>
              <div className="mt-5">
                <CreateTestForm onCreated={handleCreated} />
              </div>
            </details>
          </section>
        </main>

        <aside className="w-full space-y-4 lg:sticky lg:top-20 lg:w-80 lg:shrink-0 lg:self-start">
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2.5">
              <Sparkles aria-hidden="true" className="size-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold">Jak zostać testerem?</h2>
            </div>
            <ol className="mt-3 space-y-3">
              {HOW_IT_WORKS.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-sm font-bold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{step.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-neutral-400">
                      {step.description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div
            className={`${CARD} bg-gradient-to-br from-blue-50 to-white p-5 text-center dark:from-neutral-900 dark:to-neutral-950`}
          >
            <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-blue-600/10">
              <UsersRound aria-hidden="true" className="size-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="font-bold">Potrzebujesz pomocy?</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Napisz do nas, jeśli masz pytania o testy lub chcesz zgłosić własną
              innowację do przetestowania.
            </p>
            <Link
              to="/kontakt"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Mail aria-hidden="true" className="size-4" />
              Skontaktuj się z nami
            </Link>
          </div>
        </aside>
      </div>

      <footer className="mt-8 border-t border-slate-200/80 py-6 dark:border-neutral-800">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 dark:text-neutral-500">
          © {CURRENT_YEAR} Małopolski Hub Innowacji Społecznych. Wszelkie prawa
          zastrzeżone.
        </p>
      </footer>
    </div>
  )
}
