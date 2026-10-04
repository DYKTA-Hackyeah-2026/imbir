import { useEffect, useRef, type ReactNode } from "react"

import { ChatMessageBubble } from "./ChatMessage"
import type { ChatMessage } from "../types"

export function ChatMessageList({
  messages,
  emptyState,
  footer,
}: {
  messages: ChatMessage[]
  emptyState?: ReactNode
  footer?: ReactNode
}) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    bottomRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "end",
    })
  }, [messages, footer])

  return (
    <div
      tabIndex={0}
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="Historia rozmowy"
      className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
    >
      {messages.length === 0 ? emptyState : null}
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {footer}
      <div ref={bottomRef} />
    </div>
  )
}
