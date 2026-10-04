import type { CreatorDraft, DraftErrors } from "../types"

export type StepProps = {
  draft: CreatorDraft
  errors: DraftErrors
  onChange: (patch: Partial<CreatorDraft>) => void
}
