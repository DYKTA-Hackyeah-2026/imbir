import { CountedTextarea } from "../components/FormFields"
import { RadioChipGroup } from "../components/ChoiceControls"
import { AFFORDABILITY_OPTIONS, SIMPLICITY_OPTIONS } from "../types"
import type { StepProps } from "./types"

export function Step7Outcomes({ draft, onChange }: StepProps) {
  return (
    <>
      <CountedTextarea
        id="creator-inclusion-impact"
        label="Jak rozwiązanie wpływa na włączenie społeczne?"
        value={draft.socialInclusionImpact}
        onChange={(value) => onChange({ socialInclusionImpact: value })}
        placeholder="Np. seniorzy odzyskują kontakt z sąsiadami i łatwiej uczestniczą w życiu lokalnej społeczności…"
      />
      <CountedTextarea
        id="creator-scalability"
        label="Czy i jak rozwiązanie można skalować?"
        value={draft.scalabilityDescription}
        onChange={(value) => onChange({ scalabilityDescription: value })}
        placeholder="Np. model opiera się na jednym koordynatorze i wolontariuszach, więc można go powielać w kolejnych gminach…"
      />
      <RadioChipGroup
        legend="Czy rozwiązanie jest proste do zrozumienia?"
        name="solution-simplicity"
        options={SIMPLICITY_OPTIONS}
        value={draft.simplicity}
        onChange={(value) => onChange({ simplicity: value })}
      />
      <RadioChipGroup
        legend="Czy korzyści przewyższają koszty?"
        name="solution-affordability"
        options={AFFORDABILITY_OPTIONS}
        value={draft.affordability}
        onChange={(value) => onChange({ affordability: value })}
      />
    </>
  )
}
