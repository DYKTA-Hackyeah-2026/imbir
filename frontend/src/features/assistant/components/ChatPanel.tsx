import { Bot, MessagesSquare } from "lucide-react"

import { Card } from "@/components/ui/card"

import { AssistantError } from "./AssistantError"
import { AssistantLoadingState } from "./AssistantLoadingState"
import { ChatInput } from "./ChatInput"
import { ChatMessageList } from "./ChatMessageList"
import { ClarificationQuestion } from "./ClarificationQuestion"
import { NoSolutionCta } from "./NoSolutionCta"
import type {
  AssistantAction,
  ChatMessage,
  Clarification,
  ClarificationAnswer,
} from "../types"

function Intro() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 pt-8 pb-2 text-center sm:pt-10">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
        <Bot aria-hidden="true" className="size-7" />
      </span>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
        W czym możemy Ci pomóc?
      </h1>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        Opisz, w czym potrzebujesz pomocy. Postaram się znaleźć odpowiednie
        programy i formy wsparcia.
      </p>
      <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
        <MessagesSquare aria-hidden="true" className="size-4" />
        Możesz pisać własnymi słowami — nie musisz znać nazw programów.
      </p>
    </div>
  )
}

export function ChatPanel({
  messages,
  clarification,
  noSolution = null,
  loading = false,
  error = "",
  showIntro = false,
  onSendText,
  onClarificationSubmit,
  onRetry,
  className,
}: {
  messages: ChatMessage[]
  clarification: Clarification | null
  noSolution?: AssistantAction | null
  loading?: boolean
  error?: string
  showIntro?: boolean
  onSendText: (text: string) => void
  onClarificationSubmit: (answer: ClarificationAnswer) => void
  onRetry: () => void
  className?: string
}) {
  const showHero = showIntro && messages.length === 0

  return (
    <Card
      className={className ?? "flex flex-col gap-0 overflow-hidden py-0"}
      aria-busy={loading}
    >
      {!showHero && <h1 className="sr-only">Asystent AI — pomoc w znalezieniu programów i wsparcia</h1>}
      <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-neutral-800">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Bot aria-hidden="true" className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">Asystent AI</p>
          <p className="text-muted-foreground truncate text-xs">
            Pomoc w znalezieniu programów i wsparcia
          </p>
        </div>
      </div>

      <ChatMessageList
        messages={messages}
        emptyState={showHero ? <Intro /> : undefined}
        footer={
          clarification ? (
            <ClarificationQuestion
              key={clarification.id}
              clarification={clarification}
              disabled={loading}
              onSubmit={onClarificationSubmit}
            />
          ) : noSolution ? (
            <NoSolutionCta action={noSolution} />
          ) : null
        }
      />

      {loading ? (
        <AssistantLoadingState label="Asystent analizuje Twoje pytanie…" />
      ) : null}

      {error ? (
        <div className="px-3 pb-1">
          <AssistantError message={error} onRetry={onRetry} />
        </div>
      ) : null}

      <ChatInput onSend={onSendText} disabled={loading} />
    </Card>
  )
}
