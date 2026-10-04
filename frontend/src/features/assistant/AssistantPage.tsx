import { useCallback, useEffect, useRef, useState } from "react"

import SiteLayout from "@/components/SiteLayout"

import { assistantErrorMessage, getSearchPage, sendAssistantMessage } from "./api"
import { AssistantLayout } from "./components/AssistantLayout"
import { ChatPanel } from "./components/ChatPanel"
import { RecommendationsPanel } from "./components/RecommendationsPanel"
import type {
  AssistantAction,
  ChatMessage,
  Clarification,
  ClarificationAnswer,
  SearchResult,
  SendAssistantMessageRequest,
} from "./types"

function createId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const CHAT_CLASSNAME =
  "flex flex-col gap-0 overflow-hidden py-0 min-h-[55vh] lg:h-[calc(100vh-9rem)]"

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [clarification, setClarification] = useState<Clarification | null>(null)
  const [noSolution, setNoSolution] = useState<AssistantAction | null>(null)
  const [search, setSearch] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsError, setResultsError] = useState("")

  const lastRequestRef = useRef<SendAssistantMessageRequest | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    document.title = "Asystent AI · Małopolski Hub Innowacji Społecznych"
  }, [])

  const runSend = useCallback(async (request: SendAssistantMessageRequest) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    lastRequestRef.current = request
    setLoading(true)
    setError("")
    setResultsError("")
    setClarification(null)
    setNoSolution(null)

    try {
      const response = await sendAssistantMessage(request)
      if (requestId !== requestIdRef.current) return

      setConversationId(response.conversationId)

      if (response.assistantMessage.trim()) {
        setMessages((current) => [
          ...current,
          { id: createId(), role: "assistant", text: response.assistantMessage },
        ])
      }

      if (response.type === "clarification") {
        setClarification(response.clarification)
      } else if (response.type === "recommendations") {
        setSearch(response.search)
      } else if (response.type === "no_solution") {
        setSearch(null)
        setNoSolution(response.action)
      }
    } catch (caught) {
      if (requestId !== requestIdRef.current) return
      setError(assistantErrorMessage(caught))
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  function handleSendText(text: string) {
    setMessages((current) => [...current, { id: createId(), role: "user", text }])
    void runSend({
      ...(conversationId ? { conversationId } : {}),
      message: { type: "text", text },
    })
  }

  function handleClarificationSubmit(answer: ClarificationAnswer) {
    if (!clarification) return

    const labels = clarification.options
      .filter((option) => answer.selectedOptionIds.includes(option.id))
      .map((option) => option.label)
    const summary = [labels.join(", "), answer.additionalText?.trim()]
      .filter((part): part is string => Boolean(part))
      .join(", ")

    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", text: summary || "Odpowiedź na pytanie" },
    ])

    void runSend({
      ...(conversationId ? { conversationId } : {}),
      message: {
        type: "clarification_answer",
        questionId: clarification.id,
        selectedOptionIds: answer.selectedOptionIds,
        ...(answer.additionalText ? { additionalText: answer.additionalText } : {}),
      },
    })
  }

  const handlePageChange = useCallback(
    async (page: number) => {
      if (!search || page < 1) return
      setResultsLoading(true)
      setResultsError("")
      try {
        const response = await getSearchPage(search.id, page)
        setSearch({
          id: response.searchId,
          recommendations: response.recommendations,
          pagination: response.pagination,
        })
      } catch (caught) {
        setResultsError(assistantErrorMessage(caught))
      } finally {
        setResultsLoading(false)
      }
    },
    [search],
  )

  function handleRetry() {
    if (lastRequestRef.current) {
      void runSend(lastRequestRef.current)
    }
  }

  function handleResultsRetry() {
    if (search) void handlePageChange(search.pagination.page)
  }

  const split = search !== null
  const totalResults = search?.pagination.totalResults ?? 0

  return (
    <SiteLayout>
      <p className="sr-only" role="status" aria-live="polite">
        {loading
          ? "Asystent analizuje Twoje pytanie."
          : split
            ? `Znaleziono ${totalResults} programów.`
            : ""}
      </p>

      <AssistantLayout
        mode={split ? "split" : "centered"}
        chat={
          <ChatPanel
            messages={messages}
            clarification={clarification}
            noSolution={noSolution}
            loading={loading}
            error={error}
            showIntro={!split}
            onSendText={handleSendText}
            onClarificationSubmit={handleClarificationSubmit}
            onRetry={handleRetry}
            className={CHAT_CLASSNAME}
          />
        }
        recommendations={
          search ? (
            <RecommendationsPanel
              search={search}
              loading={resultsLoading || loading}
              error={resultsError}
              onPageChange={handlePageChange}
              onRetry={handleResultsRetry}
            />
          ) : null
        }
      />
    </SiteLayout>
  )
}
