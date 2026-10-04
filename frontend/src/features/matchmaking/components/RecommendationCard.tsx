import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ArrowRight, Building2, MapPin } from "lucide-react"
import { AUDIENCE_LABELS, RELEVANCE_LABELS } from "../labels"
import type { Recommendation } from "../types"
import { EvidenceBadge, RelevanceBadge } from "./Badges"
import { DataValue } from "./DataValue"

type RecommendationCardProps = {
  recommendation: Recommendation
  position: number
  onOpen: (recommendation: Recommendation) => void
}

export function RecommendationCard({
  recommendation,
  position,
  onOpen,
}: RecommendationCardProps) {
  const { innovation, relevance } = recommendation
  const audienceLabels = innovation.audiences.map((audience) => AUDIENCE_LABELS[audience])
  const audienceText =
    audienceLabels.slice(0, 3).join(", ") +
    (audienceLabels.length > 3 ? " i inne" : "")

  return (
    <Card className="h-full">
      <CardHeader>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Propozycja {position}
        </p>
        <CardTitle as="h2" className="text-lg">
          <button
            type="button"
            onClick={() => onOpen(recommendation)}
            className="rounded-sm text-left underline-offset-4 hover:underline focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {innovation.title}
          </button>
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <RelevanceBadge relevance={relevance} />
          <EvidenceBadge level={innovation.evidenceLevel} />
        </div>
        <p className="text-sm text-muted-foreground">
          {RELEVANCE_LABELS[relevance].description}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <p className="text-foreground">{innovation.shortDescription}</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {recommendation.fitReasons.slice(0, 3).map((reason) => (
            <li key={reason} className="flex gap-2">
              <span aria-hidden="true" className="text-primary">
                •
              </span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-auto grid gap-1.5 text-sm">
          <div className="flex items-start gap-2">
            <dt className="sr-only">Organizacja</dt>
            <Building2 aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
            <dd className="text-foreground">{innovation.organization}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="sr-only">Grupa docelowa</dt>
            <MapPin aria-hidden="true" className="mt-0.5 size-4 text-muted-foreground" />
            <dd className="text-foreground">
              <DataValue
                value={[innovation.location.municipality, innovation.location.county]
                  .filter(Boolean)
                  .join(", ")}
              />
              {audienceText ? ` • ${audienceText}` : ""}
            </dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => onOpen(recommendation)}
        >
          Zobacz szczegóły
          <ArrowRight aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}
