import { Link } from "react-router-dom"
import { Clock, FileText, ImageOff, MapPin } from "lucide-react"

import {
  formatDate,
  formatDuration,
  type MaterialSummary,
} from "@/lib/content"
import { cn } from "@/lib/utils"

export default function MaterialCard({
  material,
  className,
  showTags = true,
}: {
  material: MaterialSummary
  className?: string
  showTags?: boolean
}) {
  const image = material.thumbnailUrl ?? material.coverUrl
  const badge = material.badge ?? material.typeLabel

  return (
    <Link
      to={`/material/${material.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-neutral-800">
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageOff aria-hidden="true" className="size-6" />
          </div>
        )}
        {badge ? (
          <span className="absolute top-3 left-3 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-blue-700">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="leading-snug font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {material.title}
        </h3>
        {material.excerpt ? (
          <p className="line-clamp-3 text-sm text-slate-600 dark:text-neutral-400">
            {material.excerpt}
          </p>
        ) : null}

        <div className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
          {material.publishedAt ? <span>{formatDate(material.publishedAt)}</span> : null}
          {material.durationSeconds ? (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" className="size-3" />
              {formatDuration(material.durationSeconds)}
            </span>
          ) : null}
          {material.pages ? (
            <span className="inline-flex items-center gap-1">
              <FileText aria-hidden="true" className="size-3" />
              {material.pages} str.
            </span>
          ) : null}
          {material.region ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3" />
              {material.region}
            </span>
          ) : null}
        </div>

        {showTags && material.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {material.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  )
}
