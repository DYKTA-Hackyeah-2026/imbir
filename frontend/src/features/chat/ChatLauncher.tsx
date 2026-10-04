import { MessageCircle } from "lucide-react"
import { Button } from "../../components/ui/button"

export function ChatLauncher({ count, open, onClick }: { count: number; open: boolean; onClick: () => void }) {
  return <Button id="chat-launcher" aria-label={`Czat${count ? `, ${count} powiadomień` : ""}`} aria-expanded={open} aria-controls="floating-chat" onClick={onClick} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 size-14 rounded-full shadow-xl">
    <MessageCircle className="size-6" />
    {count > 0 && <span className="bg-destructive text-white absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full border-2 border-background px-1 text-xs font-bold">{count > 99 ? "99+" : count}</span>}
  </Button>
}
