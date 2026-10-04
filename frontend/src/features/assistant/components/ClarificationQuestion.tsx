import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"

import { Button } from "@/components/ui/button"

import { ClarificationAdditionalInput } from "./ClarificationAdditionalInput"
import { ClarificationMultiSelect } from "./ClarificationMultiSelect"
import { ClarificationSingleSelect } from "./ClarificationSingleSelect"
import type { Clarification, ClarificationAnswer } from "../types"

export function ClarificationQuestion({
  clarification,
  disabled = false,
  onSubmit,
}: {
  clarification: Clarification
  disabled?: boolean
  onSubmit: (answer: ClarificationAnswer) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const [additionalText, setAdditionalText] = useState("")
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const isSingle = clarification.selectionMode === "single"
  const canSubmit = selected.length > 0 || additionalText.trim().length > 0

  function toggleOption(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function submit() {
    if (disabled || !canSubmit) return
    onSubmit({
      selectedOptionIds: selected,
      additionalText: additionalText.trim() || undefined,
    })
  }

  return (
    <section
      aria-labelledby="assistant-clarification-heading"
      className="border-primary/30 bg-primary/5 space-y-4 rounded-2xl border-2 p-3 sm:p-4"
    >
      <h3
        id="assistant-clarification-heading"
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-semibold outline-none sm:text-lg"
      >
        {clarification.question}
      </h3>

      {isSingle ? (
        <ClarificationSingleSelect
          name={`clarification-${clarification.id}`}
          options={clarification.options}
          value={selected[0] ?? null}
          onChange={(id) => setSelected([id])}
          disabled={disabled}
        />
      ) : (
        <ClarificationMultiSelect
          options={clarification.options}
          values={selected}
          onToggle={toggleOption}
          disabled={disabled}
        />
      )}

      {clarification.allowAdditionalText ? (
        <ClarificationAdditionalInput
          value={additionalText}
          onChange={setAdditionalText}
          disabled={disabled}
        />
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        Wybrano {selected.length}{" "}
        {selected.length === 1 ? "odpowiedź" : "odpowiedzi"}.
      </p>

      <Button
        type="button"
        size="lg"
        onClick={submit}
        disabled={disabled || !canSubmit}
        className="w-full sm:w-auto"
      >
        <Send aria-hidden="true" />
        Wyślij odpowiedź
      </Button>
    </section>
  )
}
