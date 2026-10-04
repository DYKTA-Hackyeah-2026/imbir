import { Link } from "react-router-dom"
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import type { Recommendation } from "../types"

function isExternal(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function RecommendationLink({
  url,
  title,
  className,
}: {
  url: string
  title: string
  className?: string
}) {
  const label = (
    <>
      Dowiedz się więcej
      <ArrowRight aria-hidden="true" className="size-4" />
    </>
  )

  if (isExternal(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={`Dowiedz się więcej o programie ${title} (otwiera się w nowej karcie)`}
      >
        {label}
      </a>
    )
  }

  return (
    <Link to={url} className={className} aria-label={`Dowiedz się więcej o programie ${title}`}>
      {label}
    </Link>
  )
}

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const eligible = recommendation.eligibilityStatus === "eligible"

  return (
    <Card className="gap-0">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle as="h3" className="text-lg font-semibold">
            {recommendation.title}
          </CardTitle>
          <Badge variant={eligible ? "strong" : "ok"} className="shrink-0">
            {eligible ? (
              <CheckCircle2 aria-hidden="true" />
            ) : (
              <HelpCircle aria-hidden="true" />
            )}
            {eligible ? "Spełniasz warunki" : "Wymaga sprawdzenia"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <p className="text-muted-foreground text-sm leading-relaxed">
          {recommendation.summary}
        </p>

        {recommendation.matchExplanation ? (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-semibold tracking-wide uppercase">
              Dlaczego może Ci pomóc
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {recommendation.matchExplanation}
            </p>
          </div>
        ) : null}

        {recommendation.details.length > 0 ? (
          <dl className="space-y-2 text-sm">
            {recommendation.details.map((detail, index) => (
              <div key={`${detail.label}-${index}`} className="flex flex-col gap-0.5">
                <dt className="font-medium">{detail.label}</dt>
                <dd className="text-muted-foreground">{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div
          className={cn(
            "rounded-lg border p-3 text-sm",
            eligible
              ? "border-emerald-600/20 bg-emerald-600/5"
              : "border-amber-600/25 bg-amber-600/5",
          )}
        >
          <p className="flex items-start gap-2">
            {eligible ? (
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400"
              />
            ) : (
              <HelpCircle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
              />
            )}
            <span>
              {eligible
                ? "Wygląda na to, że spełniasz podane warunki."
                : "Nie mamy jeszcze wszystkich informacji, żeby sprawdzić warunki."}
            </span>
          </p>
          {recommendation.eligibilityDescription ? (
            <p className="text-muted-foreground mt-1.5 pl-6">
              {recommendation.eligibilityDescription}
            </p>
          ) : null}
        </div>

        {recommendation.url ? (
          <RecommendationLink
            url={recommendation.url}
            title={recommendation.title}
            className="bg-primary text-primary-foreground hover:bg-primary/80 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-auto"
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
