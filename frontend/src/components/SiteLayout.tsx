import type { ReactNode } from "react"

import SiteHeader from "./SiteHeader"

const CURRENT_YEAR = new Date().getFullYear()

export default function SiteLayout({
  children,
  aside,
}: {
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <SiteHeader />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <main className="min-w-0 flex-1">{children}</main>
        {aside ? (
          <aside className="w-full space-y-4 lg:sticky lg:top-20 lg:w-80 lg:shrink-0 lg:self-start">
            {aside}
          </aside>
        ) : null}
      </div>

      <footer className="border-t border-slate-200/80 py-6 dark:border-neutral-800">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-500 dark:text-neutral-500">
          © {CURRENT_YEAR} Małopolski Hub Innowacji Społecznych. Wszelkie prawa
          zastrzeżone.
        </p>
      </footer>
    </div>
  )
}
