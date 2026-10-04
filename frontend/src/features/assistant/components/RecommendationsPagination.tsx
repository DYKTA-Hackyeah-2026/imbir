import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

import { plural } from "../plural"
import type { Pagination } from "../types"

export function RecommendationsPagination({
  pagination,
  disabled = false,
  onPageChange,
}: {
  pagination: Pagination
  disabled?: boolean
  onPageChange: (page: number) => void
}) {
  if (pagination.totalResults === 0) return null

  return (
    <nav
      aria-label="Nawigacja po stronach wyników"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onPageChange(pagination.page - 1)}
        disabled={disabled || !pagination.hasPreviousPage}
      >
        <ChevronLeft aria-hidden="true" />
        Poprzednia
      </Button>

      <p aria-live="polite" className="text-muted-foreground order-first w-full text-center text-sm sm:order-none sm:w-auto">
        Strona <span className="font-semibold">{pagination.page}</span> z{" "}
        <span className="font-semibold">{Math.max(pagination.totalPages, 1)}</span>
        {" · "}
        {pagination.totalResults}{" "}
        {plural(pagination.totalResults, "program", "programy", "programów")}
      </p>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => onPageChange(pagination.page + 1)}
        disabled={disabled || !pagination.hasNextPage}
      >
        Następna
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}
