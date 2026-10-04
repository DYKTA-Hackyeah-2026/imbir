import type { ReactNode } from "react"

export function AssistantLayout({
  mode,
  chat,
  recommendations,
}: {
  mode: "centered" | "split"
  chat: ReactNode
  recommendations?: ReactNode
}) {
  if (mode === "centered") {
    return <div className="mx-auto w-full max-w-2xl">{chat}</div>
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="min-w-0 lg:sticky lg:top-20">{chat}</div>
      <div className="min-w-0">{recommendations}</div>
    </div>
  )
}
