import { useCallback, useEffect, useRef, useState } from "react"
import { DemoPanel } from "./components/DemoPanel"
import type { FeedbackValue } from "./components/FeedbackForm"
import { RecommendationDetail } from "./components/RecommendationDetail"
import { ResultsView } from "./components/ResultsView"
import { ErrorState, LoadingState, NoMatchState } from "./components/States"
import { analyzeNeed } from "./lib/needAnalysis"
import { requestRecommendations } from "./lib/matchmakingService"
import { ClarifyStep } from "./steps/ClarifyStep"
import { DescribeStep, EXAMPLE_DESCRIPTION } from "./steps/DescribeStep"
import { ReviewStep } from "./steps/ReviewStep"
import type {
  ClarifyingQuestion,
  ClarifyingQuestionId,
  MatchResult,
  NeedDraft,
  NeedProfile,
  Recommendation,
  ServiceScenario,
} from "./types"

type Step = "describe" | "clarify" | "review" | "loading" | "results" | "no-match" | "error"

const EMPTY_DRAFT: NeedDraft = {
  description: "",
  whoNeedsSupport: "",
  municipality: "",
  county: "",
  desiredOutcome: "",
  availableResources: "",
  budget: "",
  timeframe: "",
  accessibilityNeeds: "",
}

const EXAMPLE_DRAFT: NeedDraft = {
  ...EMPTY_DRAFT,
  description: EXAMPLE_DESCRIPTION,
  whoNeedsSupport: "osoby starsze mieszkające samotnie",
  desiredOutcome: "poprawa samodzielności i ograniczenie samotności",
}

const STAGES = ["Opis potrzeby", "Doprecyzowanie", "Wyniki"] as const

function stageForStep(step: Step): number {
  if (step === "describe") return 0
  if (step === "clarify" || step === "review") return 1
  return 2
}

export function MatchmakingFlow() {
  const [step, setStep] = useState<Step>("describe")
  const [draft, setDraft] = useState<NeedDraft>(EMPTY_DRAFT)
  const [answers, setAnswers] = useState<Partial<Record<ClarifyingQuestionId, string>>>({})
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([])
  const [profile, setProfile] = useState<NeedProfile | null>(null)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [selected, setSelected] = useState<Recommendation | null>(null)
  const [scenario, setScenario] = useState<ServiceScenario>("normal")
  const [errorMessage, setErrorMessage] = useState("")
  const [feedback, setFeedback] = useState<Record<string, FeedbackValue>>({})
  const isFirstRender = useRef(true)
  const runIdRef = useRef(0)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const heading = document.getElementById("step-heading")
    if (heading) {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      heading.focus({ preventScroll: true })
      heading.scrollIntoView({
        block: "start",
        behavior: reduceMotion ? "auto" : "smooth",
      })
    }
  }, [step, selected])

  const runSearch = useCallback(
    async (searchProfile: NeedProfile, activeScenario: ServiceScenario) => {
      const runId = runIdRef.current + 1
      runIdRef.current = runId
      setSelected(null)
      setErrorMessage("")
      setStep("loading")
      try {
        const nextResult = await requestRecommendations(searchProfile, activeScenario)
        if (runId !== runIdRef.current) return
        setResult(nextResult)
        setStep(nextResult.status === "ok" ? "results" : "no-match")
      } catch (error) {
        if (runId !== runIdRef.current) return
        setErrorMessage(
          error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd."
        )
        setStep("error")
      }
    },
    []
  )

  function updateDraft(patch: Partial<NeedDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
  }

  function handleDescribeSubmit() {
    const analysis = analyzeNeed(draft, answers)
    setProfile(analysis.profile)
    setQuestions(analysis.questions)
    setStep(analysis.questions.length > 0 ? "clarify" : "review")
  }

  function handleClarifySubmit() {
    const analysis = analyzeNeed(draft, answers)
    setProfile(analysis.profile)
    setQuestions(analysis.questions)
    setStep("review")
  }

  function handleConfirm() {
    if (!profile) return
    void runSearch(profile, scenario)
  }

  function handleRestart() {
    setDraft(EMPTY_DRAFT)
    setAnswers({})
    setQuestions([])
    setProfile(null)
    setResult(null)
    setSelected(null)
    setErrorMessage("")
    setScenario("normal")
    setFeedback({})
    setStep("describe")
  }

  function handleTryExample() {
    setDraft(EXAMPLE_DRAFT)
    setAnswers({})
    setScenario("normal")
    setFeedback({})
    const analysis = analyzeNeed(EXAMPLE_DRAFT, {})
    setProfile(analysis.profile)
    setQuestions(analysis.questions)
    void runSearch(analysis.profile, "normal")
  }

  const handleFeedback = useCallback(
    (innovationId: string, value: FeedbackValue) => {
      setFeedback((current) => ({ ...current, [innovationId]: value }))
    },
    []
  )

  const activeStage = stageForStep(step)

  return (
    <div className="space-y-8">
      <nav aria-label="Etapy wyszukiwania">
        <ol className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {STAGES.map((stage, index) => {
            const state =
              index === activeStage ? "bieżący" : index < activeStage ? "ukończony" : "kolejny"
            return (
              <li
                key={stage}
                aria-current={index === activeStage ? "step" : undefined}
                className={
                  index === activeStage
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }
              >
                <span className="mr-1" aria-hidden="true">
                  {index + 1}.
                </span>
                {stage}
                <span className="sr-only"> ({state})</span>
              </li>
            )
          })}
        </ol>
      </nav>

      {step === "describe" ? (
        <DescribeStep draft={draft} onChange={updateDraft} onSubmit={handleDescribeSubmit} />
      ) : null}

      {step === "clarify" ? (
        <ClarifyStep
          draft={draft}
          questions={questions}
          answers={answers}
          onAnswer={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
          onBack={() => setStep("describe")}
          onSubmit={handleClarifySubmit}
        />
      ) : null}

      {step === "review" && profile ? (
        <ReviewStep
          profile={profile}
          hasQuestions={questions.length > 0}
          onEditDescription={() => setStep("describe")}
          onBackToQuestions={() => setStep("clarify")}
          onConfirm={handleConfirm}
        />
      ) : null}

      {step === "loading" ? <LoadingState /> : null}

      {step === "results" && result ? (
        selected ? (
          <RecommendationDetail
            recommendation={selected}
            onBack={() => setSelected(null)}
            feedback={feedback[selected.innovation.id]}
            onFeedback={(value) => handleFeedback(selected.innovation.id, value)}
          />
        ) : (
          <ResultsView result={result} onOpen={setSelected} onRestart={handleRestart} />
        )
      ) : null}

      {step === "no-match" ? (
        <NoMatchState
          description={draft.description}
          incompleteEvidence={result?.notice === "incomplete-evidence"}
          onEdit={() => setStep("describe")}
          onTryExample={handleTryExample}
        />
      ) : null}

      {step === "error" ? (
        <ErrorState
          message={errorMessage}
          onRetry={handleConfirm}
          onEdit={() => setStep("describe")}
        />
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {step === "loading" ? "Trwa wyszukiwanie rozwiązań." : null}
        {step === "results" && result
          ? `Znaleziono ${result.recommendations.length} rekomendacji.`
          : null}
        {step === "no-match" ? "Nie znaleziono trafnych dopasowań." : null}
        {step === "error" ? "Usługa chwilowo niedostępna." : null}
      </p>

      <DemoPanel
        scenario={scenario}
        onChange={setScenario}
        onRerun={handleConfirm}
        canRerun={Boolean(profile) && step !== "loading"}
      />
    </div>
  )
}
