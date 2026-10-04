import { userName, type Conversation, type ChatUser } from "./api"

export function Avatar({ user }: { user: ChatUser }) {
  return <span aria-hidden="true" className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full font-semibold">{userName(user).slice(0, 1).toUpperCase()}</span>
}

export function ConversationList({ conversations, onSelect }: { conversations: Conversation[]; onSelect: (id: string) => void }) {
  if (!conversations.length) return <p className="text-muted-foreground p-6 text-center text-sm">Nie masz jeszcze rozmów. Wybierz osobę, aby rozpocząć.</p>
  return <ul>{conversations.map((item) => <li key={item.id}>
    <button className={`hover:bg-muted flex w-full items-center gap-3 border-b p-4 text-left ${item.unreadCount ? "bg-primary/5" : ""}`} onClick={() => onSelect(item.id)}>
      <Avatar user={item.otherUser} />
      <span className="min-w-0 flex-1"><span className={`block truncate text-sm ${item.unreadCount ? "font-bold" : "font-medium"}`}>{userName(item.otherUser)}</span><span className="text-muted-foreground block truncate text-xs">{item.lastMessage?.content || "Rozpocznij rozmowę"}</span></span>
      {item.unreadCount > 0 && <span aria-label={`${item.unreadCount} nieprzeczytanych wiadomości`} className="bg-primary text-primary-foreground rounded-full px-2 text-xs">{item.unreadCount}</span>}
    </button>
  </li>)}</ul>
}
