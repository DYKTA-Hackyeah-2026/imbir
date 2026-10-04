import { FileText } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { TextField } from "../components/FormFields"
import { RadioChipGroup } from "../components/ChoiceControls"
import {
  REVENUE_SCALABILITY_OPTIONS,
  REVENUE_VALIDATION_OPTIONS,
} from "../types"
import type { StepProps } from "./types"

export function Step8Grant({ draft, errors, onChange }: StepProps) {
  return (
    <>
      <Alert variant="info">
        <FileText aria-hidden="true" />
        <AlertTitle>Generator wniosku</AlertTitle>
        <AlertDescription>
          Generator wniosków jest dostępny w okresie prowadzenia naborów w konkursach
          grantowych. Uzupełnij te informacje teraz, aby w razie potrzeby szybko zgłosić
          pomysł — lub pomiń ten krok i zapisz szkic.
        </AlertDescription>
      </Alert>

      <TextField
        id="creator-grant-amount"
        label="Wnioskowana kwota dofinansowania (zł)"
        value={draft.grantAmount}
        onChange={(value) => onChange({ grantAmount: value.replace(/[^\d.]/g, "") })}
        error={errors.grantAmount}
        inputMode="decimal"
        placeholder="Np. 25000"
        help="Podaj szacunkową kwotę, jeśli ubiegasz się o finansowanie."
      />

      <RadioChipGroup
        legend="Na jakim etapie jest plan finansowania?"
        name="revenue-validation"
        options={REVENUE_VALIDATION_OPTIONS}
        value={draft.revenueValidation}
        onChange={(value) => onChange({ revenueValidation: value })}
      />

      <TextField
        id="creator-revenue-main"
        label="Główne źródło finansowania"
        value={draft.revenueMainSource}
        onChange={(value) => onChange({ revenueMainSource: value })}
        placeholder="Np. grant z konkursu, składki, darowizny, budżet gminy"
      />

      <RadioChipGroup
        legend="Jak można skalować finansowanie rozwiązania?"
        name="revenue-scalability"
        options={REVENUE_SCALABILITY_OPTIONS}
        value={draft.revenueScalability}
        onChange={(value) => onChange({ revenueScalability: value })}
      />

      <TextField
        id="creator-revenue-additional"
        label="Dodatkowe źródła finansowania"
        value={draft.revenueAdditionalSource}
        onChange={(value) => onChange({ revenueAdditionalSource: value })}
        placeholder="Np. partnerstwa lokalne, sponsorzy, opłaty za usługi"
      />
    </>
  )
}
