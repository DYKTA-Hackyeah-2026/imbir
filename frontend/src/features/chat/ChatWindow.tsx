import { useEffect, useRef, type ReactNode } from "react"
import { ArrowLeft, Minus } from "lucide-react"
import { Button } from "../../components/ui/button"

export type ChatTab = "conversations" | "requests" | "new"
export function ChatWindow({ open, title, connection, tab, requests, onTab, onBack, onClose, children }: {
  open: boolean; title?: string; connection: string; tab: ChatTab; requests: number;
  onTab: (tab: ChatTab) => void; onBack: () => void; onClose: () => void; children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null)
  useEffect(() => {
    if (open) panel.current?.focus()
  }, [open])
  useEffect(() => {
    if (open && document.activeElement === document.body) panel.current?.focus()
  }, [open, title])
  return <section ref={panel} id="floating-chat" role="dialog" aria-modal="false" aria-labelledby="chat-window-heading" tabIndex={-1} hidden={!open}
    onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); document.getElementById("chat-launcher")?.focus() } }}
    className="bg-card text-card-foreground fixed bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] left-[max(1rem,env(safe-area-inset-left))] z-50 flex h-[min(36rem,calc(100dvh-6.25rem))] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl outline-none [&[hidden]]:hidden">
    <header className="flex shrink-0 items-center gap-2 border-b p-3">
      {title && <Button variant="ghost" size="icon" aria-label="Powrót do rozmów" onClick={onBack}><ArrowLeft /></Button>}
      <div className="min-w-0 flex-1"><h2 id="chat-window-heading" className="truncate text-sm font-semibold">{title || "Wiadomości"}</h2><p role="status" className="text-muted-foreground text-xs">{connection}</p></div>
      <Button variant="ghost" size="icon" aria-label="Zminimalizuj czat" onClick={() => { onClose(); document.getElementById("chat-launcher")?.focus() }}><Minus /></Button>
    </header>
    {!title && <nav aria-label="Sekcje czatu" className="flex shrink-0 gap-1 border-b p-2">{([ ["conversations", "Rozmowy"], ["requests", `Prośby${requests ? ` (${requests})` : ""}`], ["new", "Nowa rozmowa"] ] as const).map(([key, label]) => <Button key={key} size="sm" variant={tab === key ? "secondary" : "ghost"} aria-pressed={tab === key} onClick={() => onTab(key)} className="flex-1 px-2 text-xs">{label}</Button>)}</nav>}
    {children}
  </section>
}
