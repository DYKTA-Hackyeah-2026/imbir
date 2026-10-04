import { useEffect, useRef } from "react"
import { SearchX } from "lucide-react"

import { AssistantError } from "./AssistantError"
import { RecommendationCard } from "./RecommendationCard"
import { RecommendationsPagination } from "./RecommendationsPagination"
import { RecommendationsSkeleton } from "./RecommendationsSkeleton"
import { plural } from "../plural"
import type { SearchResult } from "../types"

export function RecommendationsPanel({
  search,
  loading = false,
  error = "",
  onPageChange,
  onRetry,
}: {
  search: SearchResult
  loading?: boolean
  error?: string
  onPageChange: (page: number) => void
  onRetry?: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [search.id])

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    headingRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }, [search.pagination.page])

  return (
    <section
      aria-labelledby="recommendations-heading"
      aria-busy={loading}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="recommendations-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold tracking-tight outline-none sm:text-2xl"
        >
          Propozycje programów
        </h2>
        <p className="text-muted-foreground text-sm">
          {search.pagination.totalResults}{" "}
          {plural(search.pagination.totalResults, "wynik", "wyniki", "wyników")}
        </p>
      </div>

      {error ? <AssistantError message={error} onRetry={onRetry} /> : null}

      {loading ? (
        <RecommendationsSkeleton />
      ) : search.recommendations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-16 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
          <SearchX aria-hidden="true" className="size-6" />
          <p>Nie znaleźliśmy programów dopasowanych do Twojego opisu.</p>
          <p className="max-w-sm">
            Spróbuj opisać swoją sytuację innymi słowami albo dopisz brakujące
            szczegóły w czacie.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-4">
            {search.recommendations.map((recommendation) => (
              <li key={recommendation.id}>
                <RecommendationCard recommendation={recommendation} />
              </li>
            ))}
          </ul>

          <RecommendationsPagination
            pagination={search.pagination}
            disabled={loading}
            onPageChange={onPageChange}
          />
        </>
      )}
    </section>
  )
}
