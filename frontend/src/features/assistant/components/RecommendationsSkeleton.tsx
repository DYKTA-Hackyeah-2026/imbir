import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function RecommendationsSkeleton() {
  return (
    <div
      className="space-y-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Wczytywanie rekomendacji"
    >
      <span className="sr-only">Wczytujemy propozycje programów…</span>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="gap-0">
          <CardHeader className="gap-3">
            <div className="bg-muted h-5 w-2/3 animate-pulse rounded" />
            <div className="bg-muted h-4 w-1/3 animate-pulse rounded" />
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="bg-muted h-4 w-full animate-pulse rounded" />
            <div className="bg-muted h-4 w-5/6 animate-pulse rounded" />
            <div className="bg-muted h-16 w-full animate-pulse rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
