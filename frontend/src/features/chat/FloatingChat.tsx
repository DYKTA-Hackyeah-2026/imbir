import { useCallback, useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "../../components/ui/button"
import { errorMessage } from "../../lib/api"
import { useAuth } from "../../lib/auth"
import { chatApi, userName, type ChatEvent, type ChatRequest, type Conversation, type Message, type MessagePage } from "./api"
import { ChatLauncher } from "./ChatLauncher"
import { ChatWindow, type ChatTab } from "./ChatWindow"
import { ConversationList } from "./ConversationList"
import { ConversationView, type DisplayMessage } from "./ConversationView"
import { ChatRequests } from "./ChatRequests"
import { StartConversation } from "./StartConversation"
import { useChatSocket } from "./useChatSocket"

function mergeMessages(previous: DisplayMessage[], incoming: DisplayMessage[]) {
  const messages = new Map(previous.map((message) => [message.clientMessageId, message]))
  for (const message of incoming) messages.set(message.clientMessageId, message)
  return [...messages.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}

export default function FloatingChat() {
  const { user } = useAuth()
  return user ? <AuthenticatedChat key={user.id} userId={Number(user.id)} /> : <GuestChat />
}

function GuestChat() {
  const [open, setOpen] = useState(false)
  return <><ChatLauncher open={open} count={0} onClick={() => setOpen(!open)} /><ChatWindow open={open} connection="Zaloguj się, aby rozmawiać" tab="conversations" requests={0} onTab={() => {}} onBack={() => {}} onClose={() => setOpen(false)}><div className="space-y-4 p-6 text-sm"><p>Rozmawiaj z innymi użytkownikami HubMi.</p><Link to="/login" onClick={() => setOpen(false)} className="text-primary font-medium underline">Zaloguj się</Link></div></ChatWindow></>
}

function AuthenticatedChat({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<ChatTab>("conversations")
  const [selected, setSelected] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [requests, setRequests] = useState<ChatRequest[]>([])
  const [messages, setMessages] = useState<Record<string, DisplayMessage[]>>({})
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [messageLoading, setMessageLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [visible, setVisible] = useState(document.visibilityState === "visible")
  const [readRevision, setReadRevision] = useState(0)
  const mounted = useRef(true)
  const refreshVersion = useRef(0)
  const messageVersion = useRef(0)
  const readIds = useRef(new Map<string, string>())
  const reading = useRef(new Set<string>())
  useEffect(() => {
    mounted.current = true
    const visibility = () => setVisible(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", visibility)
    return () => { mounted.current = false; document.removeEventListener("visibilitychange", visibility) }
  }, [])

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current
    try {
      const [items, pending] = await Promise.all([chatApi<Conversation[]>("/conversations"), chatApi<ChatRequest[]>("/requests")])
      if (mounted.current && version === refreshVersion.current) { setConversations(items); setRequests(pending) }
    } catch (err) { if (mounted.current) setError(errorMessage(err)) }
    finally { if (mounted.current) setLoading(false) }
  }, [])

  const loadMessages = useCallback(async (id: string, before?: string) => {
    const version = ++messageVersion.current
    setMessageLoading(true)
    try {
      const page = await chatApi<MessagePage>(`/conversations/${id}/messages${before ? `?before=${before}` : ""}`)
      if (!mounted.current) return
      setMessages((old) => ({ ...old, [id]: mergeMessages(old[id] || [], page.messages) }))
      setHasMore((old) => ({ ...old, [id]: page.hasMore }))
    } catch (err) { if (mounted.current) setError(errorMessage(err)) }
    finally { if (mounted.current && version === messageVersion.current) setMessageLoading(false) }
  }, [])

  const event = useCallback((event: ChatEvent) => {
    const message = event.payload.message
    if (event.type === "message:new" && message) setMessages((old) => ({ ...old, [message.conversationId]: mergeMessages(old[message.conversationId] || [], [message]) }))
    if (event.type === "chat_request:accepted") setNotice("Prośba o rozmowę została zaakceptowana.")
    if (event.type === "chat_request:declined") setNotice("Prośba o rozmowę została odrzucona.")
    void refresh()
  }, [refresh])
  const reconnect = useCallback(() => { void refresh(); if (selected) void loadMessages(selected) }, [refresh, selected, loadMessages])
  const connection = useChatSocket(event, reconnect)
  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh, visible])
  useEffect(() => { if (selected && open && visible) void Promise.resolve().then(() => loadMessages(selected)) }, [selected, open, visible, loadMessages])

  const currentMessages = selected ? messages[selected] || [] : []
  const newest = currentMessages.filter((message) => !message.state).at(-1)
  useEffect(() => {
    if (!selected || !open || !visible || !newest || messageLoading || readIds.current.get(selected) === newest.id || reading.current.has(selected)) return
    const id = selected
    reading.current.add(id)
    void chatApi(`/conversations/${id}/read`, { messageId: newest.id }).then(() => {
      readIds.current.set(id, newest.id)
      void refresh()
    }).catch((err) => { if (mounted.current) setError(errorMessage(err)); readIds.current.set(id, newest.id) }).finally(() => { reading.current.delete(id); if (mounted.current) setReadRevision((revision) => revision + 1) })
  }, [selected, open, visible, newest, messageLoading, refresh, readRevision])

  const action = async (work: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("")
    try { await work(); await refresh() } catch (err) { if (mounted.current) setError(errorMessage(err)) }
    finally { if (mounted.current) setBusy(false) }
  }
  const send = async (message: DisplayMessage) => {
    setMessages((old) => ({ ...old, [message.conversationId]: mergeMessages(old[message.conversationId] || [], [{ ...message, state: "sending" }]) }))
    try {
      const saved = await chatApi<Message>(`/conversations/${message.conversationId}/messages`, { content: message.content, clientMessageId: message.clientMessageId })
      if (!mounted.current) return
      setMessages((old) => ({ ...old, [message.conversationId]: mergeMessages(old[message.conversationId] || [], [saved]) }))
      void refresh()
    } catch (err) {
      if (!mounted.current) return
      setMessages((old) => ({ ...old, [message.conversationId]: (old[message.conversationId] || []).map((item) => item.clientMessageId === message.clientMessageId && item.state ? { ...item, state: "failed" } : item) }))
      setError(errorMessage(err))
    }
  }
  const conversation = conversations.find((item) => item.id === selected)
  const count = conversations.reduce((total, item) => total + item.unreadCount, requests.length)
  return <>
    <ChatLauncher count={count} open={open} onClick={() => setOpen(!open)} />
    <ChatWindow open={open} title={selected ? conversation ? userName(conversation.otherUser) : "Rozmowa" : undefined} connection={connection} tab={tab} requests={requests.length} onTab={(next) => { setTab(next); setNotice("") }} onBack={() => setSelected(null)} onClose={() => setOpen(false)}>
      {error && <div role="alert" className="text-destructive shrink-0 border-b p-3 text-xs">{error}<Button variant="ghost" size="xs" onClick={() => { setError(""); readIds.current.clear(); void refresh(); if (selected) void loadMessages(selected) }}>Ponów</Button></div>}
      {notice && <p role="status" className="bg-primary/5 shrink-0 border-b p-3 text-xs">{notice}</p>}
      {selected ? <ConversationView key={selected} messages={currentMessages} userId={userId} loading={messageLoading} hasMore={hasMore[selected] || false} onOlder={() => { const first = currentMessages.find((message) => !message.state); if (first) void loadMessages(selected, first.id) }} onRetry={(message) => { void send(message) }} onSend={(content) => { const clientMessageId = crypto.randomUUID(); void send({ id: clientMessageId, clientMessageId, conversationId: selected, senderId: userId, content, createdAt: new Date().toISOString(), state: "sending" }) }} /> : <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? <p role="status" className="p-6 text-center text-sm">Ładowanie…</p> : tab === "conversations" ? <ConversationList conversations={conversations} onSelect={setSelected} /> : tab === "requests" ? <ChatRequests requests={requests} busy={busy} onRespond={(id, response) => { void action(async () => { const result = await chatApi<Conversation>(`/requests/${id}/${response}`, {}); if (response === "accept") { setSelected(result.id); setTab("conversations") } }) }} /> : <StartConversation busy={busy} onStart={(recipientId) => { void action(async () => { const result = await chatApi<Conversation>("/conversations", { recipientId }); setSelected(result.id); setTab("conversations") }) }} onRequest={(recipientId) => { void action(async () => { await chatApi("/requests", { recipientId }); setNotice("Prośba o rozmowę została wysłana.") }) }} onInvite={(email) => { void action(async () => { await chatApi("/invitations", { email }); setNotice("Zaproszenie zostało zapisane. Prośba będzie dostępna dla tej osoby po zalogowaniu lub rejestracji.") }) }} />}
      </div>}
    </ChatWindow>
  </>
}
