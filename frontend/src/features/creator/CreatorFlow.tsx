import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Save,
  Send,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { LoadingState } from "@/components/States"
import { ApiError, errorMessage } from "@/lib/api"
import {
  createInnovation,
  getInnovation,
  updateInnovation,
  type InnovationStatus,
} from "@/lib/innovations"
import { AssistantAside } from "./components/AssistantAside"
import { SectionCard } from "./components/SectionCard"
import { Stepper } from "./components/Stepper"
import { Step1Basics } from "./steps/Step1Basics"
import { Step2Problem } from "./steps/Step2Problem"
import { Step3Audience } from "./steps/Step3Audience"
import { Step4Solution } from "./steps/Step4Solution"
import { Step5Plan } from "./steps/Step5Plan"
import { Step6Resources } from "./steps/Step6Resources"
import { Step7Outcomes } from "./steps/Step7Outcomes"
import { Step8Grant } from "./steps/Step8Grant"
import {
  EMPTY_DRAFT,
  STEP_COUNT,
  STEPS,
  fromRecord,
  toPayload,
  validateAll,
  validateStep,
  type CreatorDraft,
  type CreatorStep,
  type DraftErrors,
} from "./types"

const DRAFT_KEY = "hubmi.creator.draftId"

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; message: string }
  | { status: "error"; message: string }

function asCreatorStep(value: number | undefined): CreatorStep {
  const step = Math.min(Math.max(value ?? 1, 1), STEP_COUNT)
  return step as CreatorStep
}

export function CreatorFlow() {
  const [draft, setDraft] = useState<CreatorDraft>(EMPTY_DRAFT)
  const [currentStep, setCurrentStep] = useState<CreatorStep>(1)
  const [passed, setPassed] = useState<Set<CreatorStep>>(new Set())
  const [errorsByStep, setErrorsByStep] = useState<
    Partial<Record<CreatorStep, DraftErrors>>
  >({})
  const [draftId, setDraftId] = useState<number | null>(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
  })
  const [loadingDraft, setLoadingDraft] = useState(draftId !== null)
  const [loadError, setLoadError] = useState("")
  const [save, setSave] = useState<SaveState>({ status: "idle" })
  const [formError, setFormError] = useState("")
  const [submittedId, setSubmittedId] = useState<number | null>(null)
  const previousStep = useRef(currentStep)

  useEffect(() => {
    if (loadingDraft) return
    if (submittedId !== null) {
      document.getElementById("creator-success")?.focus()
      return
    }
    if (formError) {
      const panel = document.getElementById(`creator-step-panel-${currentStep}`)
      const invalid = panel?.querySelector<HTMLElement>(
        'input[aria-invalid="true"], textarea[aria-invalid="true"], fieldset[aria-invalid="true"] input',
      )
      invalid?.focus()
    } else if (previousStep.current !== currentStep) {
      document.getElementById(`creator-step-header-${currentStep}`)?.focus()
    }
    previousStep.current = currentStep
  }, [currentStep, formError, loadingDraft, submittedId])

  useEffect(() => {
    document.title = "Opowiedz nam o swoim pomyśle – Małopolski Hub Innowacji Społecznych"
  }, [])

  useEffect(() => {
    if (draftId === null) return
    let active = true

    getInnovation(draftId)
      .then((record) => {
        if (!active) return
        setDraft(fromRecord(record))
        const step = asCreatorStep(record.currentStep)
        setCurrentStep(step)
        setPassed(
          new Set(
            Array.from({ length: step - 1 }, (_, index) => (index + 1) as CreatorStep),
          ),
        )
        setLoadingDraft(false)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof ApiError && error.status === 404) {
          window.localStorage.removeItem(DRAFT_KEY)
          setDraftId(null)
        }
        setLoadError(
          "Nie udało się wczytać zapisanego szkicu. Możesz wypełnić formularz od nowa.",
        )
        setLoadingDraft(false)
      })

    return () => {
      active = false
    }
  }, [draftId])

  function updateDraft(patch: Partial<CreatorDraft>) {
    setDraft((current) => ({ ...current, ...patch }))
    setErrorsByStep((current) => {
      const keys = Object.keys(patch) as (keyof CreatorDraft)[]
      if (keys.length === 0) return current
      const next = { ...current }
      const stepErrors = { ...next[currentStep] }
      let changed = false
      for (const key of keys) {
        if (stepErrors[key]) {
          delete stepErrors[key]
          changed = true
        }
      }
      if (changed) next[currentStep] = stepErrors
      return next
    })
    setSave({ status: "idle" })
  }

  function selectStep(step: CreatorStep) {
    setCurrentStep(step)
    setFormError("")
  }

  function goNext() {
    const errors = validateStep(currentStep, draft)
    if (Object.keys(errors).length > 0) {
      setErrorsByStep((current) => ({ ...current, [currentStep]: errors }))
      setFormError("Uzupełnij wymagane pola w tym kroku, aby przejść dalej.")
      return
    }
    setErrorsByStep((current) => ({ ...current, [currentStep]: {} }))
    setPassed((current) => new Set(current).add(currentStep))
    setFormError("")
    setCurrentStep((step) => asCreatorStep(step + 1))
  }

  function goBack() {
    setFormError("")
    setCurrentStep((step) => asCreatorStep(step - 1))
  }

  async function persist(status: InnovationStatus, step: number): Promise<number> {
    const payload = toPayload(draft, status, step)
    if (draftId === null) {
      const created = await createInnovation(payload)
      window.localStorage.setItem(DRAFT_KEY, String(created.id))
      setDraftId(created.id)
      return created.id
    }
    const updated = await updateInnovation(draftId, payload)
    return updated.id
  }

  async function handleSaveDraft() {
    setSave({ status: "saving" })
    setFormError("")
    try {
      const id = await persist("draft", currentStep)
      const at = new Date().toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      })
      setSave({ status: "saved", message: `Szkic zapisany o ${at} (nr ${id}).` })
    } catch (error) {
      setSave({ status: "error", message: errorMessage(error) })
    }
  }

  async function handleSubmit() {
    const invalid = validateAll(draft)
    if (invalid.length > 0) {
      const nextErrors: Partial<Record<CreatorStep, DraftErrors>> = {}
      for (const result of invalid) nextErrors[result.step] = result.errors
      setErrorsByStep((current) => ({ ...current, ...nextErrors }))
      setCurrentStep(invalid[0].step)
      setFormError(
        `Uzupełnij wymagane pola w ${invalid.length === 1 ? "kroku" : "krokach"}: ${invalid
          .map((result) => result.step)
          .join(", ")}.`,
      )
      return
    }

    setSave({ status: "saving" })
    setFormError("")
    try {
      const id = await persist("submitted", STEP_COUNT)
      window.localStorage.removeItem(DRAFT_KEY)
      setSubmittedId(id)
      setSave({ status: "idle" })
    } catch (error) {
      setSave({ status: "error", message: errorMessage(error) })
    }
  }

  function handleReset() {
    window.localStorage.removeItem(DRAFT_KEY)
    setDraft(EMPTY_DRAFT)
    setCurrentStep(1)
    setPassed(new Set())
    setErrorsByStep({})
    setDraftId(null)
    setSubmittedId(null)
    setFormError("")
    setSave({ status: "idle" })
  }

  if (loadingDraft) {
    return <LoadingState label="Wczytywanie zapisanego szkicu…" />
  }

  if (submittedId !== null) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-emerald-900 dark:bg-neutral-900">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
          <CheckCircle2 aria-hidden="true" className="size-8 text-emerald-700 dark:text-emerald-400" />
        </div>
        <h2 id="creator-success" tabIndex={-1} className="mt-4 text-2xl font-bold">Dziękujemy! Twój pomysł został wysłany.</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-neutral-400">
          Zgłoszenie nr <strong>#{submittedId}</strong> trafiło do Małopolskiego Hubu
          Innowacji Społecznych. Zespół ROPS Kraków skontaktuje się z Tobą, jeśli będzie
          potrzebne uzupełnienie informacji.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={handleReset} variant="outline">
            Dodaj kolejny pomysł
          </Button>
          <Link
            to="/"
            className={buttonVariants({ className: "bg-blue-600 text-white hover:bg-blue-700" })}
          >
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    )
  }

  const stepProps = { draft, onChange: updateDraft }

  function renderStep(step: CreatorStep) {
    const errors = errorsByStep[step] ?? {}
    switch (step) {
      case 1:
        return <Step1Basics {...stepProps} errors={errors} />
      case 2:
        return <Step2Problem {...stepProps} errors={errors} />
      case 3:
        return <Step3Audience {...stepProps} errors={errors} />
      case 4:
        return <Step4Solution {...stepProps} errors={errors} />
      case 5:
        return <Step5Plan {...stepProps} errors={errors} />
      case 6:
        return <Step6Resources {...stepProps} errors={errors} />
      case 7:
        return <Step7Outcomes {...stepProps} errors={errors} />
      case 8:
        return <Step8Grant {...stepProps} errors={errors} />
    }
  }

  return (
    <div className="space-y-6">
      <Stepper current={currentStep} completed={passed} onSelect={selectStep} />

      {loadError ? (
        <Alert variant="warning">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 flex-1 space-y-5">
          {STEPS.map((meta) => (
            <SectionCard
              key={meta.step}
              step={meta.step}
              title={meta.title}
              subtitle={meta.subtitle}
              expanded={currentStep === meta.step}
              completed={passed.has(meta.step)}
              hasErrors={Object.keys(errorsByStep[meta.step] ?? {}).length > 0}
              onToggle={() => selectStep(meta.step)}
            >
              {renderStep(meta.step)}
            </SectionCard>
          ))}

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900/95">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={save.status === "saving"}
              >
                {save.status === "saving" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Zapisz szkic
              </Button>
              <p
                role="status"
                aria-live="polite"
                className={
                  save.status === "error"
                    ? "min-w-0 text-sm font-medium text-rose-600 dark:text-rose-400"
                    : "min-w-0 text-sm text-emerald-700 dark:text-emerald-400"
                }
              >
                {save.status === "saved" || save.status === "error" ? save.message : null}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              {currentStep > 1 ? (
                <Button type="button" variant="ghost" onClick={goBack}>
                  <ArrowLeft aria-hidden="true" />
                  Wstecz
                </Button>
              ) : null}
              {currentStep < STEP_COUNT ? (
                <Button
                  type="button"
                  onClick={goNext}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Dalej
                  <ArrowRight aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={save.status === "saving"}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {save.status === "saving" ? (
                    <Loader2 aria-hidden="true" className="animate-spin" />
                  ) : (
                    <Send aria-hidden="true" />
                  )}
                  Wyślij zgłoszenie
                </Button>
              )}
            </div>
          </div>
        </div>

        <aside className="w-full space-y-4 lg:sticky lg:top-20 lg:w-80 lg:shrink-0 lg:self-start">
          <AssistantAside />
        </aside>
      </div>
    </div>
  )
}
