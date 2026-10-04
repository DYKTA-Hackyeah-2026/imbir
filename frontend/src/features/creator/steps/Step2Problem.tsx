import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"

import { CountedTextarea, TextField } from "../components/FormFields"
import {
  FrequencyScale,
  RadioCardGroup,
  RadioChipGroup,
} from "../components/ChoiceControls"
import {
  FREQUENCY_OPTIONS,
  INTENSITY_OPTIONS,
  SCALE_OPTIONS,
} from "../types"
import type { StepProps } from "./types"

export function Step2Problem({ draft, errors, onChange }: StepProps) {
  return (
    <>
      <CountedTextarea
        id="creator-problem"
        label="Jaki problem społeczny rozwiązujesz?"
        value={draft.problemDescription}
        onChange={(value) => onChange({ problemDescription: value })}
        required
        error={errors.problemDescription}
        placeholder="Opisz krótko, jaki problem chcesz rozwiązać…"
      />
      <CountedTextarea
        id="creator-problem-important"
        label="Dlaczego ten problem jest ważny?"
        value={draft.problemImportant}
        onChange={(value) => onChange({ problemImportant: value })}
        required
        error={errors.problemImportant}
        placeholder="Wyjaśnij, dlaczego ten problem jest istotny, kogo dotyczy i jakie może mieć skutki…"
      />

      <RadioCardGroup
        legend="Intensywność problemu"
        hint="Zaznacz, jak bardzo poważny jest to problem bez Twojego rozwiązania:"
        name="problem-intensity"
        options={INTENSITY_OPTIONS}
        value={draft.problemIntensity}
        onChange={(value) => onChange({ problemIntensity: value })}
        error={errors.problemIntensity}
        required
      />

      <FrequencyScale
        legend="Częstotliwość występowania problemu"
        hint="Zaznacz, jak często występuje problem, który odpowiada Twojemu rozwiązaniu:"
        name="problem-frequency"
        options={FREQUENCY_OPTIONS}
        value={draft.problemFrequency}
        onChange={(value) => onChange({ problemFrequency: value })}
        error={errors.problemFrequency}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50/70 p-4 sm:flex-row sm:items-center dark:border-sky-900 dark:bg-sky-950/30">
        <MapPin aria-hidden="true" className="size-5 shrink-0 text-sky-700 dark:text-sky-300" />
        <p className="flex-1 text-sm text-slate-700 dark:text-neutral-300">
          Możesz skorzystać z <strong>Mapy Wyzwań Społecznych Małopolski</strong>, aby
          lepiej opisać problem. Znajdziesz tam przykłady wyzwań, dane i inspiracje z
          regionu.
        </p>
        <Link
          to="/raporty"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-800 dark:bg-neutral-900 dark:text-sky-200"
        >
          Zobacz mapę
        </Link>
      </div>

      <details className="rounded-xl border border-slate-200 p-4 dark:border-neutral-800">
        <summary className="cursor-pointer rounded-sm text-base font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
          Dodaj szczegóły (opcjonalnie)
        </summary>
        <div className="mt-4 space-y-6">
          <RadioChipGroup
            legend="Skala problemu"
            name="problem-scale"
            options={SCALE_OPTIONS}
            value={draft.problemScale}
            onChange={(value) => onChange({ problemScale: value })}
          />
          <TextField
            id="creator-problem-sources"
            label="Źródła danych o problemie"
            value={draft.problemSources}
            onChange={(value) => onChange({ problemSources: value })}
            placeholder="Np. raport Obserwatora, dane GUS, diagnoza lokalna"
            help="Możesz podać źródła, na których się opierasz."
          />
          <TextField
            id="creator-map-reference"
            label="Odniesienie do Mapy Wyzwań Społecznych"
            value={draft.challengesMapReference}
            onChange={(value) => onChange({ challengesMapReference: value })}
            placeholder="Np. wyzwanie „Samotność seniorów”"
          />
        </div>
      </details>
    </>
  )
}
