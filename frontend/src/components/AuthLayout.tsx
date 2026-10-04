import type { ReactNode } from "react"

import SiteHeader from "./SiteHeader"

const CURRENT_YEAR = new Date().getFullYear()

export default function AuthLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 via-slate-50 to-slate-50 text-slate-900 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-950 dark:text-neutral-100">
      <SiteHeader compact />

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="text-center text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 text-center text-sm text-slate-600 dark:text-neutral-400">
                {description}
              </p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-neutral-500">
            © {CURRENT_YEAR} Małopolski Hub Innowacji Społecznych
          </p>
        </div>
      </main>
    </div>
  )
}
