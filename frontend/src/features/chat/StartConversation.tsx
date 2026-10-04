import { useEffect, useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { errorMessage } from "../../lib/api"
import { chatApi, userName, type ChatUser } from "./api"

type SearchResult = { term: string; users: ChatUser[]; error: string }

export function StartConversation({ busy, onInvite }: { busy: boolean; onInvite: (id: number) => void }) {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SearchResult>({ term: "", users: [], error: "" })
  const [loading, setLoading] = useState(false)
  const term = query.trim()
  useEffect(() => {
    if (!term) return
    let active = true
    const timer = setTimeout(() => {
      setLoading(true)
      chatApi<ChatUser[]>(`/users?q=${encodeURIComponent(term)}`)
        .then((users) => { if (active) setResult({ term, users, error: "" }) })
        .catch((err) => { if (active) setResult({ term, users: [], error: errorMessage(err) }) })
        .finally(() => { if (active) setLoading(false) })
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [term])
  const current = result.term === term ? result : { users: [], error: "" }
  return <div className="space-y-3 p-4">
    <label htmlFor="chat-search" className="text-sm font-medium">Zaproś do rozmowy</label>
    <Input id="chat-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Wpisz nazwę użytkownika" autoComplete="off" />
    <p id="chat-invite-hint" className="text-muted-foreground text-xs">Rozmowa zacznie się dopiero, gdy druga osoba zaakceptuje zaproszenie.</p>
    {!term && <p role="status" className="text-muted-foreground text-sm">Wpisz nazwę użytkownika, aby go znaleźć.</p>}
    {term && loading && <p role="status" className="text-muted-foreground text-sm">Szukanie…</p>}
    {term && !loading && current.error && <p role="alert" className="text-destructive text-sm">{current.error}</p>}
    {term && !loading && !current.error && !current.users.length && <p role="status" className="text-muted-foreground text-sm">Brak wyników.</p>}
    <p role="status" className="sr-only">{term && !loading && !current.error && current.users.length ? `Znaleziono ${current.users.length} użytkowników.` : ""}</p>
    <ul className="space-y-3">{term && !loading ? current.users.map((user) => <li key={user.id} className="space-y-2 rounded-lg border p-3"><p className="text-sm font-medium">{userName(user)}</p><Button size="sm" disabled={busy} aria-label={`Zaproś do rozmowy: ${userName(user)}`} onClick={() => onInvite(user.id)}>Zaproś do rozmowy</Button></li>) : null}</ul>
  </div>
}
