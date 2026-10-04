import { Link } from "react-router-dom"
import { CalendarRange, ChevronRight, MapPin, Users } from "lucide-react"

import type { InnovationTest } from "@/lib/tester"
import { formatDateRange } from "../lib/format"
import { TestStatusBadge } from "./StatusBadge"

export function TestCard({
  test,
  innovationTitle,
}: {
  test: InnovationTest
  innovationTitle?: string | null
}) {
  const dateRange = formatDateRange(test.startAt, test.endAt)
  const slots =
    test.slotsLeft === null || test.slotsLeft === undefined
      ? test.maxTesters
        ? `${test.maxTesters} miejsc`
        : null
      : test.slotsLeft > 0
        ? `wolne miejsca: ${test.slotsLeft}`
        : "brak wolnych miejsc"

  return (
    <Link
      to={`/tester/${test.id}`}
      className="group flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg leading-snug font-bold group-hover:text-blue-700 dark:group-hover:text-blue-300">
            {test.title}
          </h3>
          <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-300">
            {innovationTitle ?? test.innovationTitle ?? test.innovationId}
          </p>
        </div>
        <TestStatusBadge status={test.status} />
      </div>

      {test.description ? (
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">
          {test.description}
        </p>
      ) : null}

      <ul className="mt-auto flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-neutral-400">
        {test.location ? (
          <li className="inline-flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {test.location}
          </li>
        ) : null}
        {dateRange ? (
          <li className="inline-flex items-center gap-1.5">
            <CalendarRange aria-hidden="true" className="size-4 shrink-0" />
            {dateRange}
          </li>
        ) : null}
        {slots ? (
          <li className="inline-flex items-center gap-1.5">
            <Users aria-hidden="true" className="size-4 shrink-0" />
            {slots}
          </li>
        ) : null}
      </ul>

      <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
        Zobacz szczegóły testu
        <ChevronRight
          aria-hidden="true"
          className="size-4 transition-transform group-hover:translate-x-0.5"
        />
      </span>
    </Link>
  )
}
