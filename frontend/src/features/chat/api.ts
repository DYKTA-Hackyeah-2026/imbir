import { API_BASE, apiFetch, parseError } from "../../lib/api"

export type ChatUser = { id: number; name: string }
export type Message = { id: string; conversationId: string; senderId: number; content: string; clientMessageId: string; createdAt: string }
export type Conversation = { id: string; otherUser: ChatUser; unreadCount: number; lastMessage: Message | null; updatedAt: string }
export type ChatRequest = { id: string; sender: ChatUser; createdAt: string; status: string }
export type MessagePage = { messages: Message[]; hasMore: boolean }
export type ChatEvent = { type: string; payload: { message?: Message; conversationId?: string } }
export const userName = (user: ChatUser) => user.name || `Użytkownik #${user.id}`

export async function chatApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await apiFetch(`/api/v1/chat${path}`, body === undefined ? {} : {
    method: "POST", body: JSON.stringify(body),
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()).data as T
}

export async function openChatSocket(): Promise<WebSocket> {
  const { ticket } = await chatApi<{ ticket: string }>("/ws-ticket", {})
  const url = new URL(`${API_BASE}/api/v1/chat/ws`, location.origin)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.searchParams.set("ticket", ticket)
  return new WebSocket(url)
}
