import { useMemo, useState } from "react"
import {
  ArrowUpRight,
  BadgePercent,
  Building2,
  CalendarDays,
  HandCoins,
  Search,
  Wallet,
} from "lucide-react"

import SiteLayout from "@/components/SiteLayout"
import { EmptyState } from "@/components/States"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type GrantStatus = "open" | "soon" | "closed"

type Grant = {
  id: string
  name: string
  funder: string
  amountMin: number
  amountMax: number
  deadline: string | null
  status: GrantStatus
  areas: string[]
  coverage: string
  description: string
  url: string
}

const GRANTS: Grant[] = [
  {
    id: "malopolskie-inicjatywy-spoleczne",
    name: "Małopolskie Inicjatywy Społeczne 2026",
    funder: "Województwo Małopolskie",
    amountMin: 10000,
    amountMax: 150000,
    deadline: "2026-11-30",
    status: "open",
    areas: ["Innowacje społeczne", "Społeczność lokalna"],
    coverage: "do 90% dofinansowania",
    description:
      "Dotacje na tworzenie i wdrażanie innowacyjnych rozwiązań odpowiadających na lokalne potrzeby społeczne w Małopolsce.",
    url: "https://example.org/granty/malopolskie-inicjatywy-spoleczne",
  },
  {
    id: "aktywni-seniorzy",
    name: "Program Aktywni Seniorzy",
    funder: "Fundacja Wspierania Inicjatyw Lokalnych",
    amountMin: 5000,
    amountMax: 50000,
    deadline: "2026-12-15",
    status: "open",
    areas: ["Seniorzy", "Wsparcie"],
    coverage: "do 100% dofinansowania",
    description:
      "Wsparcie projektów aktywizujących osoby starsze: warsztaty cyfrowe, wolontariat, integracja i przeciwdziałanie samotności.",
    url: "https://example.org/granty/aktywni-seniorzy",
  },
  {
    id: "zdrowie-psychiczne-mlodziezy",
    name: "Zdrowie psychiczne dzieci i młodzieży",
    funder: "Fundusze Europejskie / NCBR",
    amountMin: 50000,
    amountMax: 300000,
    deadline: "2026-12-01",
    status: "soon",
    areas: ["Zdrowie psychiczne", "Młodzież"],
    coverage: "do 85% dofinansowania",
    description:
      "Nabór na programy profilaktyki i wsparcia psychicznego w szkołach oraz placówkach lokalnych. Start naboru wkrótce.",
    url: "https://example.org/granty/zdrowie-psychiczne",
  },
  {
    id: "dostepnosc-plus",
    name: "Dostępność Plus – edycja małopolska",
    funder: "Państwowy Fundusz Rehabilitacji Osób Niepełnosprawnych",
    amountMin: 20000,
    amountMax: 200000,
    deadline: "2027-01-31",
    status: "open",
    areas: ["Dostępność", "Seniorzy"],
    coverage: "do 95% dofinansowania",
    description:
      "Dofinansowanie likwidacji barier architektonicznych i cyfrowych oraz poprawy dostępności usług publicznych.",
    url: "https://example.org/granty/dostepnosc-plus",
  },
  {
    id: "edukacja-cyfrowa",
    name: "Granty na edukację cyfrową",
    funder: "Fundacja Nowe Technologie",
    amountMin: 3000,
    amountMax: 30000,
    deadline: "2026-09-15",
    status: "closed",
    areas: ["Edukacja", "Wykluczenie cyfrowe"],
    coverage: "do 80% dofinansowania",
    description:
      "Mikrogranty na szkolenia i warsztaty podnoszące kompetencje cyfrowe mieszkańców regionu.",
    url: "https://example.org/granty/edukacja-cyfrowa",
  },
  {
    id: "mikrogranty-mlodziez",
    name: "Mikrogranty dla młodzieży",
    funder: "Europejski Korpus Solidarności",
    amountMin: 2000,
    amountMax: 15000,
    deadline: null,
    status: "open",
    areas: ["Młodzież", "Partycypacja"],
    coverage: "do 100% dofinansowania",
    description:
      "Nabór ciągły na małe projekty realizowane przez młodzież na rzecz lokalnych społeczności.",
    url: "https://example.org/granty/mikrogranty-mlodziez",
  },
  {
    id: "zielona-malopolska",
    name: "Zielona Małopolska – EkoInicjatywy",
    funder: "WFOŚiGW w Krakowie",
    amountMin: 10000,
    amountMax: 100000,
    deadline: "2026-12-20",
    status: "soon",
    areas: ["Ekologia", "Społeczność lokalna"],
    coverage: "do 90% dofinansowania",
    description:
      "Wsparcie inicjatyw ekologicznych: edukacja przyrodnicza, zieleń miejska i działania klimatyczne.",
    url: "https://example.org/granty/zielona-malopolska",
  },
  {
    id: "wsparcie-ngo",
    name: "Wsparcie organizacji pozarządowych",
    funder: "Narodowy Instytut Wolności",
    amountMin: 15000,
    amountMax: 120000,
    deadline: "2027-02-28",
    status: "open",
    areas: ["NGO", "Rozwój lokalny"],
    coverage: "do 85% dofinansowania",
    description:
      "Granty na wzmocnienie instytucjonalne i rozwój kompetencji organizacji pozarządowych działających lokalnie.",
    url: "https://example.org/granty/wsparcie-ngo",
  },
]

const STATUS_LABELS: Record<GrantStatus, string> = {
  open: "Otwarty",
  soon: "Wkrótce",
  closed: "Zamknięty",
}

const STATUS_STYLES: Record<GrantStatus, string> = {
  open: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  soon: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  closed: "border-slate-300 bg-slate-100 text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
}

const FILTERS: { value: GrantStatus | "all"; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "open", label: "Otwarte" },
  { value: "soon", label: "Wkrótce" },
  { value: "closed", label: "Zamknięte" },
]

const amountFormat = new Intl.NumberFormat("pl-PL")

function formatAmount(value: number): string {
  return `${amountFormat.format(value)} zł`
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "Nabór ciągły"
  const date = new Date(deadline)
  if (Number.isNaN(date.getTime())) return "Nabór ciągły"
  return `do ${date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`
}

function GrantCard({ grant }: { grant: Grant }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <HandCoins aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="leading-snug font-semibold">{grant.name}</h3>
            <p className="text-muted-foreground mt-0.5 inline-flex items-center gap-1.5 text-sm">
              <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{grant.funder}</span>
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
            STATUS_STYLES[grant.status],
          )}
        >
          {STATUS_LABELS[grant.status]}
        </span>
      </div>

      <p className="text-sm text-slate-600 dark:text-neutral-400">
        {grant.description}
      </p>

      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
          <Wallet aria-hidden="true" className="size-4 text-blue-600" />
          <div>
            <p className="text-muted-foreground text-xs">Dofinansowanie</p>
            <p className="font-semibold tabular-nums">
              {formatAmount(grant.amountMin)} – {formatAmount(grant.amountMax)}
            </p>
          </div>
        </div>
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
          <CalendarDays aria-hidden="true" className="size-4 text-blue-600" />
          <div>
            <p className="text-muted-foreground text-xs">Termin</p>
            <p className="font-medium">{formatDeadline(grant.deadline)}</p>
          </div>
        </div>
        <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
          <BadgePercent aria-hidden="true" className="size-4 text-blue-600" />
          <div>
            <p className="text-muted-foreground text-xs">Poziom wsparcia</p>
            <p className="font-medium">{grant.coverage}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {grant.areas.map((area) => (
          <span
            key={area}
            className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {area}
          </span>
        ))}
      </div>

      <a
        href={grant.url}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
      >
        Zobacz szczegóły i złóż wniosek
        <ArrowUpRight aria-hidden="true" className="size-4" />
      </a>
    </article>
  )
}

export default function GrantsPage() {
  const [status, setStatus] = useState<GrantStatus | "all">("all")
  const [query, setQuery] = useState("")

  const grants = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return GRANTS.filter((grant) => {
      if (status !== "all" && grant.status !== status) return false
      if (!needle) return true
      return (
        grant.name.toLowerCase().includes(needle) ||
        grant.funder.toLowerCase().includes(needle) ||
        grant.areas.some((area) => area.toLowerCase().includes(needle))
      )
    })
  }, [status, query])

  const openCount = GRANTS.filter((grant) => grant.status === "open").length
  const totalPool = GRANTS.reduce((sum, grant) => sum + grant.amountMax, 0)

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
            <HandCoins aria-hidden="true" className="size-3.5" />
            Finansowanie
          </span>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            Granty
          </h1>
          <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
            Przeglądaj dostępne granty i dofinansowania dla organizacji,
            samorządów i grup nieformalnych. Znajdź wsparcie dla swojego projektu
            społecznego.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/70">
              <p className="text-muted-foreground text-xs">Otwarte nabory</p>
              <p className="text-xl font-bold tabular-nums">{openCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/70">
              <p className="text-muted-foreground text-xs">Łączna pula (maks.)</p>
              <p className="text-xl font-bold tabular-nums">
                {amountFormat.format(totalPool)} zł
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-72 items-center justify-center lg:flex">
          <div className="flex size-24 items-center justify-center rounded-full bg-blue-500/10">
            <HandCoins aria-hidden="true" className="size-12 text-blue-600" />
          </div>
        </div>
      </section>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="bg-muted flex flex-wrap items-center gap-1 rounded-lg p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                status === filter.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Szukaj grantu, fundatora lub obszaru…"
            aria-label="Szukaj grantów"
            className="h-10 pl-10"
          />
        </div>
      </div>

      {grants.length === 0 ? (
        <EmptyState message="Brak grantów spełniających kryteria." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grants.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      )}

      <p className="text-muted-foreground mt-6 text-center text-xs">
        Przykładowe dane poglądowe. Terminy i kwoty mogą się zmieniać —
        szczegóły zawsze sprawdzaj u organizatora naboru.
      </p>
    </SiteLayout>
  )
}
