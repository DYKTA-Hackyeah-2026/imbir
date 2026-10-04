import { CountedTextarea } from "../components/FormFields"
import type { StepProps } from "./types"

export function Step4Solution({ draft, errors, onChange }: StepProps) {
  return (
    <>
      <CountedTextarea
        id="creator-solution"
        label="Na czym polega Twoje rozwiązanie?"
        value={draft.solutionDescription}
        onChange={(value) => onChange({ solutionDescription: value })}
        required
        error={errors.solutionDescription}
        help="Opisz, jak działa pomysł i co jest w nim nowego lub wyjątkowego."
        placeholder="Np. stały punkt sąsiedzki z koordynatorem, dyżurami wolontariuszy i wspólnym kalendarzem zajęć…"
      />
      <CountedTextarea
        id="creator-existing-solutions"
        label="Jakie podobne rozwiązania już istnieją?"
        value={draft.existingSolutions}
        onChange={(value) => onChange({ existingSolutions: value })}
        placeholder="Np. istnieją pojedyncze kluby seniora, ale brakuje wsparcia sąsiedzkiego w miejscu zamieszkania…"
      />
      <CountedTextarea
        id="creator-expected-change"
        label="Jaka zmiana ma nastąpić dzięki rozwiązaniu?"
        value={draft.expectedChange}
        onChange={(value) => onChange({ expectedChange: value })}
        required
        error={errors.expectedChange}
        placeholder="Np. seniorzy rzadziej czują się samotni i łatwiej załatwiają codzienne sprawy…"
      />
    </>
  )
}
