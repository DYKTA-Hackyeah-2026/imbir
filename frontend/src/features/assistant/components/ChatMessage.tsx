import { Bot } from "lucide-react"

import { cn } from "@/lib/utils"

import type { ChatMessage as ChatMessageType } from "../types"

export function ChatMessageBubble({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex gap-2.5", isUser && "justify-end")}>
      {!isUser ? (
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"
        >
          <Bot className="size-4.5" />
        </span>
      ) : null}

      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
            : "bg-muted/60 rounded-tl-sm",
        )}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"><span className="sr-only">{isUser ? "Ty: " : "Asystent: "}</span>{message.text}</p>
      </div>
    </div>
  )
}
