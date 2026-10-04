import { Link } from "react-router-dom"
import { ArrowLeft, Lightbulb, Sparkles } from "lucide-react"

import SiteHeader from "@/components/SiteHeader"
import { CreatorFlow } from "@/features/creator/CreatorFlow"

const CURRENT_YEAR = new Date().getFullYear()

export default function CreatorPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wróć do strony głównej
        </Link>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-sky-50 via-white to-blue-50 p-6 sm:p-8 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
          <div className="flex items-center gap-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Opowiedz nam o swoim pomyśle
              </h1>
              <p className="mt-3 text-base text-slate-600 sm:text-lg dark:text-neutral-400">
                Wypełnij prosty formularz i podziel się swoim pomysłem na innowację
                społeczną. Możesz zapisać szkic i wrócić do niego później.
              </p>
            </div>

            <div
              aria-hidden="true"
              className="relative ml-auto hidden h-44 w-80 shrink-0 lg:block"
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-100/90 to-blue-100/70 dark:from-neutral-800/80 dark:to-neutral-900/60" />
              <span className="absolute top-4 right-28 flex size-24 rotate-6 items-center justify-center rounded-3xl bg-amber-300 text-amber-900 shadow-lg">
                <Lightbulb className="size-12" />
              </span>
              <Sparkles className="absolute top-6 right-8 size-6 text-blue-500" />
              <Sparkles className="absolute right-52 bottom-8 size-4 text-sky-500" />
              <p className="absolute right-5 bottom-4 -rotate-3 font-serif text-xl leading-tight italic text-blue-700 dark:text-blue-300">
                Małe pomysły
                <br />
                wielkie zmiany
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <CreatorFlow />
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
