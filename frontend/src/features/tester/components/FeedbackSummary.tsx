import { MessageSquareQuote, Star, ThumbsUp } from "lucide-react"

import type { InnovationFeedbackAggregate } from "@/lib/tester"
import { formatDate } from "../lib/format"
import { Stars } from "./RatingScale"

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-neutral-800 dark:bg-neutral-950/40">
      <p className="text-2xl font-bold tabular-nums">
        {value === null ? "–" : value.toFixed(1)}
      </p>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-neutral-400">{label}</p>
    </div>
  )
}

export function FeedbackSummary({
  aggregate,
}: {
  aggregate: InnovationFeedbackAggregate
}) {
  if (aggregate.feedbackCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-neutral-700 dark:text-neutral-400">
        <MessageSquareQuote aria-hidden="true" className="mx-auto mb-2 size-6" />
        Brak opinii testerów. Bądź pierwszą osobą, która przetestuje to rozwiązanie.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <p className="text-4xl font-extrabold tabular-nums">
            {aggregate.averages.overall?.toFixed(1) ?? "–"}
          </p>
          {aggregate.averages.overall !== null ? (
            <div>
              <Stars value={aggregate.averages.overall} />
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                {aggregate.feedbackCount}{" "}
                {aggregate.feedbackCount === 1 ? "opinia" : "opinie"}
              </p>
            </div>
          ) : null}
        </div>

        {aggregate.wouldUseAgainRatio !== null ? (
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <ThumbsUp aria-hidden="true" className="size-4" />
            {Math.round(aggregate.wouldUseAgainRatio * 100)}% użyłoby ponownie
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Ocena ogólna" value={aggregate.averages.overall} />
        <Metric label="Przydatność" value={aggregate.averages.usefulness} />
        <Metric label="Łatwość użycia" value={aggregate.averages.easeOfUse} />
      </div>

      <ul className="space-y-3">
        {aggregate.data.slice(0, 6).map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/40"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Stars value={entry.overallRating} size="size-4" />
              {entry.createdAt ? (
                <span className="text-xs text-slate-500 dark:text-neutral-400">
                  {formatDate(entry.createdAt)}
                </span>
              ) : null}
            </div>
            {entry.whatWorked ? (
              <p className="mt-2 text-sm">
                <span className="font-semibold">Co działa dobrze: </span>
                {entry.whatWorked}
              </p>
            ) : null}
            {entry.problems ? (
              <p className="mt-1 text-sm">
                <span className="font-semibold">Problemy: </span>
                {entry.problems}
              </p>
            ) : null}
            {entry.suggestions ? (
              <p className="mt-1 text-sm">
                <span className="font-semibold">Propozycje usprawnień: </span>
                {entry.suggestions}
              </p>
            ) : null}
            {entry.comment ? (
              <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                {entry.comment}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400">
        <Star aria-hidden="true" className="size-3.5" />
        Opinie pochodzą od osób, które zgłosiły udział w testach.
      </p>
    </div>
  )
}
