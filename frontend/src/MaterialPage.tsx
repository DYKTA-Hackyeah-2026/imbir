import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  ImageOff,
  MapPin,
  User,
} from "lucide-react"

import MaterialCard from "@/components/MaterialCard"
import SiteLayout from "@/components/SiteLayout"
import { ErrorState, LoadingState } from "@/components/States"
import { ApiError, errorMessage } from "@/lib/api"
import {
  formatBytes,
  formatDate,
  formatDuration,
  getMaterial,
  getMaterialDownloadUrl,
  type MaterialDetail,
} from "@/lib/content"

export default function MaterialPage() {
  const { slug } = useParams()
  const [material, setMaterial] = useState<MaterialDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    document.title = "Materiał · Małopolski Hub Innowacji Społecznych"
    if (!slug) return
    let active = true
    async function run() {
      setLoading(true)
      setError("")
      setNotFound(false)
      try {
        const data = await getMaterial(slug as string)
        if (!active) return
        setMaterial(data)
        document.title = `${data.title} · Małopolski Hub Innowacji Społecznych`
      } catch (caught) {
        if (!active) return
        if (caught instanceof ApiError && caught.status === 404) {
          setNotFound(true)
          document.title = "Nie znaleziono materiału · Małopolski Hub Innowacji Społecznych"
        } else {
          setError(errorMessage(caught))
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <SiteLayout>
        <LoadingState label="Wczytywanie materiału…" />
      </SiteLayout>
    )
  }

  if (notFound) {
    return (
      <SiteLayout>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <h1 className="text-2xl font-bold">Nie znaleziono materiału</h1>
          <p className="text-muted-foreground text-sm">
            Ten materiał nie istnieje lub nie został opublikowany.
          </p>
          <Link
            to="/materialy"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Wróć do bazy wiedzy
          </Link>
        </div>
      </SiteLayout>
    )
  }

  if (error || !material) {
    return (
      <SiteLayout>
        <ErrorState message={error || "Nie udało się wczytać materiału."} />
      </SiteLayout>
    )
  }

  const cover = material.coverUrl ?? material.thumbnailUrl
  const downloadUrl = material.fileUrl ?? getMaterialDownloadUrl(material.id)

  return (
    <SiteLayout>
      <Link
        to="/materialy"
        className="text-muted-foreground mb-4 inline-flex items-center gap-1.5 text-sm hover:text-blue-600"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Wróć do bazy wiedzy
      </Link>

      <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative aspect-[16/7] bg-slate-100 dark:bg-neutral-800">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-400">
              <ImageOff aria-hidden="true" className="size-8" />
            </div>
          )}
        </div>

        <div className="space-y-4 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-blue-600 px-2.5 py-0.5 font-semibold text-white">
              {material.badge ?? material.typeLabel}
            </span>
            {material.category ? (
              <Link
                to={`/kategoria/${material.category.slug}`}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-700 hover:text-blue-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {material.category.name}
              </Link>
            ) : null}
            {material.topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/temat/${topic.slug}`}
                className="text-muted-foreground rounded-full border border-slate-200 px-2.5 py-0.5 hover:text-blue-600 dark:border-neutral-700"
              >
                {topic.name}
              </Link>
            ))}
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {material.title}
          </h1>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {material.author ? (
              <span className="inline-flex items-center gap-1.5">
                <User aria-hidden="true" className="size-4" />
                {material.author}
              </span>
            ) : null}
            {material.publishedAt ? (
              <span>{formatDate(material.publishedAt)}</span>
            ) : null}
            {material.region ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4" />
                {material.region}
              </span>
            ) : null}
            {material.durationSeconds ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock aria-hidden="true" className="size-4" />
                {formatDuration(material.durationSeconds)}
              </span>
            ) : null}
            {material.pages ? (
              <span className="inline-flex items-center gap-1.5">
                <FileText aria-hidden="true" className="size-4" />
                {material.pages} str.
              </span>
            ) : null}
          </div>

          {material.fileUrl ? (
            <a
              href={downloadUrl}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Download aria-hidden="true" className="size-4" />
              Pobierz plik
              {material.fileSizeBytes ? (
                <span className="font-normal opacity-80">
                  ({formatBytes(material.fileSizeBytes)})
                </span>
              ) : null}
            </a>
          ) : null}

          {material.videoUrl ? (
            <a
              href={material.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Obejrzyj nagranie
            </a>
          ) : null}

          {material.excerpt ? (
            <p className="text-lg text-slate-600 dark:text-neutral-400">
              {material.excerpt}
            </p>
          ) : null}

          {material.body ? (
            <div
              className="space-y-4 break-words leading-relaxed text-slate-700 [&_a]:text-blue-600 [&_a]:underline [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1 [&_img]:max-w-full [&_iframe]:max-w-full [&_video]:max-w-full [&_pre]:overflow-x-auto dark:text-neutral-300 dark:[&_a]:text-blue-300"
              dangerouslySetInnerHTML={{ __html: material.body }}
            />
          ) : null}

          {material.gallery.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {material.gallery.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-56 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : null}

          {material.attachments.length > 0 ? (
            <div className="space-y-2">
              <h2 className="font-semibold">Załączniki</h2>
              {material.attachments.map((attachment) => (
                <a
                  key={attachment.url}
                  href={attachment.url}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-blue-300 dark:border-neutral-800"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <FileText aria-hidden="true" className="size-4 shrink-0 text-blue-600" />
                    <span className="truncate">{attachment.name}</span>
                  </span>
                  <span className="text-muted-foreground inline-flex shrink-0 items-center gap-2">
                    {attachment.sizeBytes ? formatBytes(attachment.sizeBytes) : null}
                    <Download aria-hidden="true" className="size-4" />
                  </span>
                </a>
              ))}
            </div>
          ) : null}

          {material.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {material.tags.map((tag) => (
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
      </article>

      {material.related.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Podobne materiały</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {material.related.map((related) => (
              <MaterialCard key={related.id} material={related} />
            ))}
          </div>
        </section>
      ) : null}
    </SiteLayout>
  )
}
