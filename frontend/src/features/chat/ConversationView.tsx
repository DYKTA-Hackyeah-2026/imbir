import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import type { Message } from "./api"

export type DisplayMessage = Message & { state?: "sending" | "failed" }
export function ConversationView({ messages, userId, loading, hasMore, onOlder, onSend, onRetry }: {
  messages: DisplayMessage[]; userId: number; loading: boolean; hasMore: boolean;
  onOlder: () => void; onSend: (content: string) => void; onRetry: (message: DisplayMessage) => void;
}) {
  const [draft, setDraft] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const lastId = messages.at(-1)?.id
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }) }, [lastId])
  const send = () => { if (!draft.trim()) return; onSend(draft.trim()); setDraft("") }
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4" aria-label="Historia wiadomości">
      {hasMore && <Button variant="ghost" disabled={loading} className="mb-3 w-full" onClick={onOlder}>Starsze wiadomości</Button>}
      {loading && <p role="status" className="text-muted-foreground text-center text-sm">Ładowanie…</p>}
      {!loading && !messages.length && <p className="text-muted-foreground text-center text-sm">Napisz pierwszą wiadomość.</p>}
      <ol className="space-y-3">{messages.map((message) => <li key={message.id} className={`flex ${message.senderId === userId ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${message.senderId === userId ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{message.content}</p>
          <div className="mt-1 text-right text-[10px] opacity-75"><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString("pl-PL")}>{new Date(message.createdAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}</time>{message.state === "sending" && " · Wysyłanie…"}</div>
          {message.state === "failed" && <button className="mt-1 text-xs underline" onClick={() => onRetry(message)}>Nie wysłano. Spróbuj ponownie</button>}
        </div>
      </li>)}</ol><div ref={bottom} />
    </div>
    <form className="flex items-end gap-2 border-t p-3" onSubmit={(event) => { event.preventDefault(); send() }}>
      <Textarea aria-label="Wiadomość" placeholder="Napisz wiadomość…" className="min-h-16 max-h-32 resize-none" maxLength={4000} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send() } }} />
      <Button type="submit" size="icon" aria-label="Wyślij wiadomość" disabled={!draft.trim()}><Send /></Button>
    </form>
  </div>
}
