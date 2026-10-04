import { CountedTextarea } from "../components/FormFields"
import { CheckboxCardGroup } from "../components/ChoiceControls"
import { AREA_OPTIONS, AUDIENCE_OPTIONS } from "../types"
import type { StepProps } from "./types"

export function Step3Audience({ draft, errors, onChange }: StepProps) {
  return (
    <>
      <CheckboxCardGroup
        legend="Kto skorzysta z Twojego rozwiązania?"
        hint="Wybierz jedną lub więcej grup docelowych."
        options={AUDIENCE_OPTIONS}
        values={draft.audiences}
        onChange={(values) => onChange({ audiences: values })}
        error={errors.audiences}
        columns={3}
      />

      <CheckboxCardGroup
        legend="Gdzie będzie działać rozwiązanie?"
        hint="Wybierz obszar działania."
        options={AREA_OPTIONS}
        values={draft.areas}
        onChange={(values) => onChange({ areas: values })}
        error={errors.areas}
        columns={3}
      />

      <details className="rounded-xl border border-slate-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer rounded-sm text-base font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
          Dodaj szczegóły (opcjonalnie)
        </summary>
        <div className="mt-4 space-y-6">
          <CountedTextarea
            id="creator-audience-notes"
            label="Opisz odbiorców"
            value={draft.audienceNotes}
            onChange={(value) => onChange({ audienceNotes: value })}
            placeholder="Np. osoby starsze mieszkające samotnie, ich rodziny i lokalni wolontariusze"
          />
          <CountedTextarea
            id="creator-audience-needs"
            label="Jakie potrzeby mają odbiorcy?"
            value={draft.audienceNeeds}
            onChange={(value) => onChange({ audienceNeeds: value })}
            placeholder="Np. poczucie bezpieczeństwa, kontakt z innymi, łatwy dostęp do informacji"
          />
          <CountedTextarea
            id="creator-exclusion-risk"
            label="Kto jest zagrożony wykluczeniem?"
            value={draft.exclusionRiskDescription}
            onChange={(value) => onChange({ exclusionRiskDescription: value })}
            placeholder="Np. osoby z niepełnosprawnościami, seniorzy bez wsparcia rodziny"
          />
        </div>
      </details>
    </>
  )
}
