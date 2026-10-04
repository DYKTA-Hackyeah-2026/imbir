import { Link } from "react-router-dom"
import { Download, FileText } from "lucide-react"

import {
  formatBytes,
  formatDate,
  getMaterialDownloadUrl,
  type MaterialSummary,
} from "@/lib/content"
import { cn } from "@/lib/utils"

export default function ReportCard({
  material,
  className,
}: {
  material: MaterialSummary
  className?: string
}) {
  const cover = material.thumbnailUrl ?? material.coverUrl
  const downloadUrl = material.fileUrl ?? getMaterialDownloadUrl(material.id)

  return (
    <div
      className={cn(
        "flex gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <Link
        to={`/material/${material.slug}`}
        className="flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-sky-500 to-blue-600 text-white"
      >
        {cover ? (
          <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <FileText aria-hidden="true" className="size-7" />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
            {material.badge ?? material.typeLabel}
          </span>
          {material.publishedAt ? (
            <span className="text-slate-500 dark:text-neutral-400">
              {formatDate(material.publishedAt)}
            </span>
          ) : null}
          {material.pages ? (
            <span className="text-slate-500 dark:text-neutral-400">
              {material.pages} str.
            </span>
          ) : null}
        </div>

        <Link
          to={`/material/${material.slug}`}
          className="text-sm leading-snug font-semibold hover:text-blue-600 dark:hover:text-blue-400"
        >
          {material.title}
        </Link>

        {material.excerpt ? (
          <p className="line-clamp-2 text-xs text-slate-600 dark:text-neutral-400">
            {material.excerpt}
          </p>
        ) : null}

        {material.fileUrl ? (
          <a
            href={downloadUrl}
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
          >
            <Download aria-hidden="true" className="size-3.5" />
            Pobierz PDF
            {material.fileSizeBytes ? (
              <span className="font-normal opacity-70">
                ({formatBytes(material.fileSizeBytes)})
              </span>
            ) : null}
          </a>
        ) : null}
      </div>
    </div>
  )
}
