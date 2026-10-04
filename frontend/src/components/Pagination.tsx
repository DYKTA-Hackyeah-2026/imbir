import { Button } from "@/components/ui/button"

export default function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Paginacja"
      className="mt-6 flex items-center justify-center gap-3"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Poprzednia
      </Button>
      <span className="text-sm text-slate-600 dark:text-neutral-400">
        Strona {page} z {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Następna
      </Button>
    </nav>
  )
}
