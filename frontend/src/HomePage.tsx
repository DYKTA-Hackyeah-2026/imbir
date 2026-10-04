import {
  createElement,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bookmark,
  Bot,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  Mail,
  MessagesSquare,
  Search,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react"

import MaterialCard from "@/components/MaterialCard"
import ReportCard from "@/components/ReportCard"
import SiteHeader from "@/components/SiteHeader"
import { EmptyState, ErrorState, LoadingState } from "@/components/States"
import { errorMessage } from "@/lib/api"
import {
  getHome,
  type Category,
  type HomeAggregate,
  type PopularSearch,
  type Topic,
} from "@/lib/content"
import { accentClasses, materialIcon } from "@/lib/appearance"
import { cn } from "@/lib/utils"

const CURRENT_YEAR = new Date().getFullYear()

const CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"

function countLabel(count: number): string {
  if (count === 1) return "materiał"
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "materiały"
  return "materiałów"
}

function SectionHeading({
  icon: Icon,
  title,
  actionTo,
  actionLabel,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  actionTo?: string
  actionLabel?: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Icon className="size-4" />
        </span>
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
      </div>
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          {actionLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}

function SidebarCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn(CARD, "p-4", className)}>{children}</div>
}

function CategoryCard({ category }: { category: Category }) {
  const tone = accentClasses(category.accent)
  return (
    <Link
      to={`/kategoria/${category.slug}`}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-slate-200/60 p-4 transition-shadow hover:shadow-md dark:border-neutral-800",
        tone.card,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            tone.icon,
          )}
        >
          {createElement(materialIcon(category.icon), { className: "size-5" })}
        </span>
        <div className="min-w-0">
          <h3 className="leading-snug font-semibold">{category.name}</h3>
          {category.description ? (
            <p className="mt-0.5 text-sm text-slate-600 dark:text-neutral-400">
              {category.description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            tone.badge,
          )}
        >
          {category.materialCount} {countLabel(category.materialCount)}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600"
        />
      </div>
    </Link>
  )
}

function TopicChip({ topic }: { topic: Topic }) {
  return (
    <Link
      to={`/temat/${topic.slug}`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
    >
      {createElement(materialIcon(topic.icon), {
        className: "size-4 text-blue-600 dark:text-blue-400",
      })}
      {topic.name}
      <span className="text-muted-foreground text-xs">{topic.materialCount}</span>
    </Link>
  )
}

export default function HomePage() {
  const [data, setData] = useState<HomeAggregate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    document.title = "Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      try {
        const home = await getHome()
        if (active) setData(home)
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
  }, [reloadKey])

  const categories = data?.categories ?? []
  const topics = data?.topics ?? []
  const featured = data?.featured ?? []
  const reports = data?.reports ?? []
  const learning = data?.learning ?? []
  const mostSearched = data?.mostSearched ?? []

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 space-y-8">
          {/* AI assistant hero */}
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <Sparkles aria-hidden="true" className="size-3.5" />
                Asystent AI
              </span>
              <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
                Chat z agentem AI
              </h1>
              <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
                Porozmawiaj z agentem i zapytaj o innowacje społeczne, raporty i
                materiały. Asystent pomoże Ci je znaleźć i wyjaśni, jak z nich
                korzystać.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  <MessagesSquare aria-hidden="true" className="size-4" />
                  Rozpocznij rozmowę
                </Link>
                <Link
                  to="/materialy"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  Przejdź do bazy wiedzy
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-80 items-center justify-center lg:flex">
              <div className="relative h-52 w-72">
                <div className="absolute top-2 right-10 flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
                  <Bot aria-hidden="true" className="size-7" />
                </div>
                <div className="absolute top-10 right-40 max-w-40 rounded-2xl rounded-br-sm bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-md dark:bg-neutral-800 dark:text-neutral-200">
                  Jakie są innowacje dla seniorów?
                </div>
                <div className="absolute top-28 right-2 max-w-44 rounded-2xl rounded-bl-sm bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-md">
                  Sprawdź kategorię „Gotowe innowacje” — mam kilka propozycji!
                </div>
                <div className="absolute right-8 bottom-2 flex size-16 items-center justify-center rounded-full bg-blue-500/10">
                  <Sparkles aria-hidden="true" className="size-8 text-blue-600" />
                </div>
              </div>
            </div>
          </section>

          {loading ? (
            <LoadingState label="Wczytywanie bazy wiedzy…" />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => setReloadKey((key) => key + 1)}
            />
          ) : (
            <>
              {/* Categories */}
              <section>
                <SectionHeading
                  icon={Sparkles}
                  title="Przeglądaj według kategorii"
                  actionTo="/materialy"
                  actionLabel="Zobacz wszystkie kategorie"
                />
                {categories.length === 0 ? (
                  <EmptyState message="Brak kategorii." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {categories.map((category) => (
                      <CategoryCard key={category.id} category={category} />
                    ))}
                  </div>
                )}
              </section>

              {/* Topics */}
              {topics.length > 0 ? (
                <section className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Star aria-hidden="true" className="size-4 text-blue-600" />
                    Popularne tematy
                  </span>
                  {topics.map((topic) => (
                    <TopicChip key={topic.id} topic={topic} />
                  ))}
                </section>
              ) : null}

              {/* Featured */}
              <section>
                <SectionHeading
                  icon={Lightbulb}
                  title="Polecane innowacje"
                  actionTo="/materialy?featured=true"
                  actionLabel="Zobacz wszystkie"
                />
                {featured.length === 0 ? (
                  <EmptyState message="Brak polecanych materiałów." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {featured.map((material) => (
                      <MaterialCard key={material.id} material={material} />
                    ))}
                  </div>
                )}
              </section>

              {/* Reports */}
              <section>
                <SectionHeading
                  icon={Bookmark}
                  title="Raporty i publikacje"
                  actionTo="/raporty"
                  actionLabel="Zobacz wszystkie"
                />
                {reports.length === 0 ? (
                  <EmptyState message="Brak raportów i publikacji." />
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {reports.map((material) => (
                      <ReportCard key={material.id} material={material} />
                    ))}
                  </div>
                )}
              </section>

              {/* Learning */}
              <section>
                <SectionHeading
                  icon={GraduationCap}
                  title="Ucz się i działaj"
                  actionTo="/nauka"
                  actionLabel="Zobacz wszystkie"
                />
                {learning.length === 0 ? (
                  <EmptyState message="Brak materiałów edukacyjnych." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {learning.map((material) => (
                      <MaterialCard key={material.id} material={material} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-full space-y-4 lg:sticky lg:top-20 lg:w-80 lg:shrink-0 lg:self-start">
          <SidebarCard>
            <div className="mb-3 flex items-center gap-2">
              <Star aria-hidden="true" className="size-4 text-blue-600" />
              <h2 className="font-bold">Najczęściej szukane</h2>
            </div>
            {mostSearched.length === 0 ? (
              <p className="text-muted-foreground text-sm">Brak danych.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {mostSearched.map((item: PopularSearch) => (
                  <li key={item.term}>
                    <Link
                      to={`/szukaj?q=${encodeURIComponent(item.term)}`}
                      className="group flex items-center gap-2.5 py-2.5 text-sm text-slate-700 hover:text-blue-700 dark:text-neutral-300 dark:hover:text-blue-300"
                    >
                      <Search
                        aria-hidden="true"
                        className="size-4 shrink-0 text-slate-400"
                      />
                      <span className="flex-1">{item.term}</span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SidebarCard>

          {topics.length > 0 ? (
            <SidebarCard>
              <div className="mb-3 flex items-center gap-2">
                <Bookmark aria-hidden="true" className="size-4 text-blue-600" />
                <h2 className="font-bold">Popularne tematy</h2>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {topics.map((topic) => (
                  <li key={topic.id}>
                    <Link
                      to={`/temat/${topic.slug}`}
                      className="group flex items-center gap-2.5 py-2.5 text-sm text-slate-700 hover:text-blue-700 dark:text-neutral-300 dark:hover:text-blue-300"
                    >
                      {createElement(materialIcon(topic.icon), {
                        className:
                          "size-4 shrink-0 text-blue-600 dark:text-blue-400",
                      })}
                      <span className="flex-1">{topic.name}</span>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarCard>
          ) : null}

          <div
            className={cn(
              CARD,
              "bg-gradient-to-br from-blue-50 to-white p-5 text-center dark:from-neutral-900 dark:to-neutral-950",
            )}
          >
            <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-blue-600/10">
              <UsersRound aria-hidden="true" className="size-6 text-blue-600" />
            </div>
            <h2 className="font-bold">Potrzebujesz pomocy?</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Nie wiesz, czego szukasz? Skontaktuj się z naszym zespołem. Chętnie
              pomożemy znaleźć odpowiednie materiały.
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

      <footer className="mt-4 border-t border-slate-200/80 py-6 dark:border-neutral-800">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 dark:text-neutral-500">
          © {CURRENT_YEAR} Małopolski Hub Innowacji Społecznych. Wszelkie prawa
          zastrzeżone.
        </p>
      </footer>
    </div>
  )
}
