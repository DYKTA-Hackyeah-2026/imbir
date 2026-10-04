import { Button } from "../../components/ui/button"
import { Avatar } from "./ConversationList"
import { userName, type ChatRequest } from "./api"

export function ChatRequests({ requests, busy, onRespond }: { requests: ChatRequest[]; busy: boolean; onRespond: (id: string, action: "accept" | "decline") => void }) {
  if (!requests.length) return <p className="text-muted-foreground p-6 text-center text-sm">Brak oczekujących próśb o rozmowę.</p>
  return <ul>{requests.map((request) => <li key={request.id} className="bg-primary/5 space-y-3 border-b p-4">
    <div className="flex items-center gap-3"><Avatar user={request.sender} /><div><p className="text-sm font-semibold">{userName(request.sender)}</p><time className="text-muted-foreground text-xs" dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleString("pl-PL")}</time></div></div>
    <div className="flex gap-2"><Button disabled={busy} onClick={() => onRespond(request.id, "accept")}>Akceptuj</Button><Button variant="outline" disabled={busy} onClick={() => onRespond(request.id, "decline")}>Odrzuć</Button></div>
  </li>)}</ul>
}
