import { CountedTextarea, TextField } from "../components/FormFields"
import { RadioChipGroup } from "../components/ChoiceControls"
import { INNOVATION_TYPE_OPTIONS } from "../types"
import type { StepProps } from "./types"

export function Step1Basics({ draft, errors, onChange }: StepProps) {
  return (
    <>
      <TextField
        id="creator-title"
        label="Nazwa pomysłu"
        value={draft.title}
        onChange={(value) => onChange({ title: value })}
        required
        error={errors.title}
        placeholder="Np. Sąsiedzkie Centra Wsparcia Seniorów"
      />
      <CountedTextarea
        id="creator-description"
        label="Krótki opis pomysłu"
        value={draft.description}
        onChange={(value) => onChange({ description: value })}
        required
        error={errors.description}
        help="Opisz pomysł w 2–3 zdaniach. Napisz, co to jest i komu ma pomóc."
        placeholder="Np. Lokalne punkty, w których wolontariusze pomagają seniorom w codziennych sprawach i przeciwdziałają samotności."
      />
      <RadioChipGroup
        legend="Typ rozwiązania"
        hint="Wybierz, jak najbliżej opisać swój pomysł. Możesz to później zmienić."
        name="innovation-type"
        options={INNOVATION_TYPE_OPTIONS.map((value) => ({ value, label: value }))}
        value={draft.innovationType}
        onChange={(value) => onChange({ innovationType: value })}
      />
    </>
  )
}
