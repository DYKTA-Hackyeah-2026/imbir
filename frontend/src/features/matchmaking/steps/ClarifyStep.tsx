import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight } from "lucide-react"
import type { ClarifyingQuestion, ClarifyingQuestionId, NeedDraft } from "../types"

type ClarifyStepProps = {
  draft: NeedDraft
  questions: ClarifyingQuestion[]
  answers: Partial<Record<ClarifyingQuestionId, string>>
  onAnswer: (id: ClarifyingQuestionId, value: string) => void
  onBack: () => void
  onSubmit: () => void
}

export function ClarifyStep({
  draft,
  questions,
  answers,
  onAnswer,
  onBack,
  onSubmit,
}: ClarifyStepProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 id="step-heading" tabIndex={-1} className="text-3xl font-bold md:text-4xl">
          Doprecyzujmy Twoją potrzebę
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Aby lepiej dobrać rozwiązania, potrzebujemy jeszcze kilku krótkich informacji.
          Odpowiedzi są opcjonalne, a Twój wcześniejszy opis został zachowany.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-1 pt-6">
          <p className="text-sm font-medium text-muted-foreground">Twój opis</p>
          <p className="text-foreground">{draft.description}</p>
        </CardContent>
      </Card>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        {questions.map((question) => (
          <ClarifyingQuestionField
            key={question.id}
            question={question}
            value={answers[question.id] ?? ""}
            onChange={(value) => onAnswer(question.id, value)}
          />
        ))}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" size="lg" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Wróć do opisu
          </Button>
          <Button type="submit" size="lg">
            Dalej
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  )
}

function ClarifyingQuestionField({
  question,
  value,
  onChange,
}: {
  question: ClarifyingQuestion
  value: string
  onChange: (value: string) => void
}) {
  const optionValues = question.options.map((option) => option.value)
  const startsAsOther = Boolean(value) && !optionValues.includes(value)
  const [mode, setMode] = useState<"preset" | "other">(startsAsOther ? "other" : "preset")
  const [other, setOther] = useState(value)

  const helpId = `${question.id}-help`

  return (
    <fieldset
      className="rounded-xl border border-border bg-card p-4"
      aria-describedby={helpId}
    >
      <legend className="px-1 text-lg font-medium">{question.question}</legend>
      <p id={helpId} className="mb-3 text-sm text-muted-foreground">
        {question.helpText}
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2.5 text-base transition-colors has-checked:border-primary has-checked:bg-primary/5 hover:bg-muted/60"
          >
            <input
              type="radio"
              name={question.id}
              value={option.value}
              checked={mode === "preset" && value === option.value}
              onChange={() => {
                setMode("preset")
                onChange(option.value)
              }}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}

        {question.allowOther ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-input px-3 py-2.5 text-base transition-colors has-checked:border-primary has-checked:bg-primary/5 hover:bg-muted/60">
            <input
              type="radio"
              name={question.id}
              value="__other__"
              checked={mode === "other"}
              onChange={() => {
                setMode("other")
                onChange(other || value)
              }}
              className="size-4 accent-primary"
            />
            Inna odpowiedź
          </label>
        ) : null}
      </div>

      {question.allowOther && mode === "other" ? (
        <div className="mt-3 space-y-2">
          <Label htmlFor={`${question.id}-other`}>Wpisz własną odpowiedź</Label>
          <Input
            id={`${question.id}-other`}
            value={other}
            onChange={(event) => {
              setOther(event.target.value)
              onChange(event.target.value)
            }}
            placeholder="Krótka odpowiedź"
          />
        </div>
      ) : null}
    </fieldset>
  )
}
