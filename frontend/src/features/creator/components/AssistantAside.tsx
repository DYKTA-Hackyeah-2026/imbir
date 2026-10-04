import { Link } from "react-router-dom"
import {
  BookOpen,
  ChevronRight,
  FileText,
  Lightbulb,
  Mail,
  Palette,
  Route,
  Sparkles,
  UsersRound,
} from "lucide-react"

const CARD =
  "rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"

const AI_ACTIONS = [
  {
    icon: Lightbulb,
    title: "Pomóż rozwinąć pomysł",
    description: "Rozbuduj opis, doprecyzuj założenia.",
    to: "/chat",
    tone: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  },
  {
    icon: Sparkles,
    title: "Zasugeruj rozwiązania",
    description: "Poznaj możliwe podejścia i inspiracje.",
    to: "/matchmaking",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    icon: Palette,
    title: "Wizualizuj pomysł",
    description: "Stwórz prostą wizualizację swojego pomysłu.",
    to: "/chat",
    tone: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
] as const

const MATERIALS = [
  {
    icon: BookOpen,
    title: "Canvas Innowacji Społecznych",
    description: "Poznaj krok po kroku, jak opisać swój pomysł.",
    to: "/nauka",
    tone: "bg-blue-600",
  },
  {
    icon: FileText,
    title: "Wzór wniosku grantowego",
    description: "Zobacz przykładowy dokument.",
    to: "/nauka",
    tone: "bg-emerald-600",
  },
  {
    icon: Route,
    title: "Przykładowe innowacje",
    description: "Zainspiruj się sprawdzonymi rozwiązaniami.",
    to: "/matchmaking",
    tone: "bg-violet-600",
  },
] as const

export function AssistantAside() {
  return (
    <>
      <div className={`${CARD} p-5`}>
        <div className="flex items-start gap-2.5">
          <Sparkles aria-hidden="true" className="mt-0.5 size-5 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Asystent AI</h2>
              <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-400/10 dark:text-blue-300">
                Twój pomocnik
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Potrzebujesz wsparcia? Skorzystaj z asystenta AI, który pomoże Ci lepiej
              opisać i rozwinąć pomysł.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2">
          {AI_ACTIONS.map((action) => (
            <li key={action.title}>
              <Link
                to={action.to}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/60 dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-blue-900"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${action.tone}`}
                >
                  <action.icon aria-hidden="true" className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{action.title}</span>
                  <span className="block text-xs text-slate-500 dark:text-neutral-400">
                    {action.description}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className={`${CARD} p-5`}>
        <div className="flex items-center gap-2.5">
          <BookOpen aria-hidden="true" className="size-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold">Przydatne materiały</h2>
        </div>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Sprawdź materiały, które pomogą Ci lepiej przygotować pomysł.
        </p>
        <ul className="mt-3 divide-y divide-slate-100 dark:divide-neutral-800">
          {MATERIALS.map((material) => (
            <li key={material.title}>
              <Link
                to={material.to}
                className="group flex items-center gap-3 py-3"
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-white ${material.tone}`}
                >
                  <material.icon aria-hidden="true" className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    {material.title}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-neutral-400">
                    {material.description}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`${CARD} bg-gradient-to-br from-blue-50 to-white p-5 text-center dark:from-neutral-900 dark:to-neutral-950`}
      >
        <div className="mx-auto mb-2 flex size-11 items-center justify-center rounded-full bg-blue-600/10">
          <UsersRound aria-hidden="true" className="size-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="font-bold">Potrzebujesz pomocy?</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Skontaktuj się z naszym zespołem. Chętnie odpowiemy na Twoje pytania.
        </p>
        <Link
          to="/kontakt"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Mail aria-hidden="true" className="size-4" />
          Skontaktuj się z nami
        </Link>
      </div>
    </>
  )
}
