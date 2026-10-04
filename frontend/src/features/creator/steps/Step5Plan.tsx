import { CountedTextarea } from "../components/FormFields"
import type { StepProps } from "./types"

export function Step5Plan({ draft, onChange }: StepProps) {
  return (
    <>
      <CountedTextarea
        id="creator-plan-steps"
        label="Jakie kroki planujesz podjąć?"
        value={draft.planSteps}
        onChange={(value) => onChange({ planSteps: value })}
        help="Opisz kolejne etapy realizacji. Ta sekcja jest opcjonalna, ale pomaga ocenić gotowość pomysłu."
        placeholder="Np. 1) rekrutacja koordynatora, 2) pilotaż w dwóch gminach, 3) szkolenie wolontariuszy, 4) ewaluacja po 3 miesiącach…"
      />
      <CountedTextarea
        id="creator-future-vision"
        label="Jak wyobrażasz sobie rozwój rozwiązania?"
        value={draft.futureVision}
        onChange={(value) => onChange({ futureVision: value })}
        placeholder="Np. po roku działamy w 10 gminach, a model jest gotowy do powielenia w całej Małopolsce…"
      />
    </>
  )
}
