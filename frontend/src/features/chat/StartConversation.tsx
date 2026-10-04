import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { errorMessage } from "../../lib/api"
import { chatApi, userName, type ChatUser } from "./api"

export function StartConversation({ busy, onStart, onRequest, onInvite }: { busy: boolean; onStart: (id: number) => void; onRequest: (id: number) => void; onInvite: (email: string) => void }) {
  const [query, setQuery] = useState("")
  const [users, setUsers] = useState<ChatUser[]>([])
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      chatApi<ChatUser[]>(`/users?q=${encodeURIComponent(query)}`).then((items) => { if (active) { setUsers(items); setError("") } }).catch((err) => { if (active) setError(errorMessage(err)) }).finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [query])
  return <div className="space-y-5 p-4">
    <div className="space-y-3"><label htmlFor="chat-search" className="text-sm font-medium">Znajdź użytkownika</label><Input id="chat-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Szukaj po nazwie" />
      {loading && <p role="status" className="text-muted-foreground text-sm">Szukanie…</p>}{error && <p role="alert" className="text-destructive text-sm">{error}</p>}
      {!loading && !error && !users.length && <p role="status" className="text-muted-foreground text-sm">Brak wyników. Możesz zaprosić osobę przez e-mail.</p>}
      <p role="status" className="sr-only">{!loading && !error && users.length ? `Znaleziono ${users.length} użytkowników.` : ""}</p>
      <ul className="space-y-3">{users.map((user) => <li key={user.id} className="space-y-2 rounded-lg border p-3"><p className="text-sm font-medium">{userName(user)}</p><div className="flex flex-wrap gap-2"><Button size="sm" disabled={busy} aria-label={`Rozpocznij rozmowę z ${userName(user)}`} onClick={() => onStart(user.id)}>Rozpocznij rozmowę</Button><Button size="sm" variant="outline" disabled={busy} aria-label={`Wyślij prośbę do ${userName(user)}`} onClick={() => onRequest(user.id)}>Wyślij prośbę</Button></div></li>)}</ul>
    </div>
    <form className="space-y-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); if (!busy) onInvite(email) }}><label htmlFor="chat-email" className="text-sm font-medium">Zaproś przez e-mail</label><Input id="chat-email" type="email" autoComplete="email" aria-describedby="chat-invite-hint" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="osoba@example.com" /><p id="chat-invite-hint" className="text-muted-foreground text-xs">Prośba będzie dostępna po zalogowaniu lub utworzeniu konta przez zaproszoną osobę.</p><Button type="submit" disabled={busy || !email.trim()}>Wyślij zaproszenie</Button></form>
  </div>
}
