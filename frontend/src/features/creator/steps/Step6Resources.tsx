import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CountedTextarea } from "../components/FormFields"
import { RadioChipGroup } from "../components/ChoiceControls"
import type { CostDraft, PartnerDraft, TeamMemberDraft } from "../types"
import type { StepProps } from "./types"

const COST_TYPE_OPTIONS = [
  { value: "fixed", label: "Koszt stały" },
  { value: "variable", label: "Koszt zmienny" },
] as const

function RowShell({
  title,
  onRemove,
  children,
}: {
  title: string
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600 dark:text-neutral-300">{title}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Usuń: ${title}`}
        >
          <Trash2 aria-hidden="true" />
          Usuń
        </Button>
      </div>
      {children}
    </li>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="w-full border-dashed">
      <Plus aria-hidden="true" />
      {label}
    </Button>
  )
}

export function Step6Resources({ draft, onChange }: StepProps) {
  function updateTeamMember(index: number, patch: Partial<TeamMemberDraft>) {
    onChange({
      teamMembers: draft.teamMembers.map((member, i) =>
        i === index ? { ...member, ...patch } : member,
      ),
    })
  }

  function updatePartner(index: number, patch: Partial<PartnerDraft>) {
    onChange({
      partners: draft.partners.map((partner, i) =>
        i === index ? { ...partner, ...patch } : partner,
      ),
    })
  }

  function updateCost(index: number, patch: Partial<CostDraft>) {
    onChange({
      costs: draft.costs.map((cost, i) => (i === index ? { ...cost, ...patch } : cost)),
    })
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Zespół</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Wskaż osoby, które współtworzą lub będą realizować pomysł.
          </p>
        </div>
        {draft.teamMembers.length > 0 ? (
          <ul className="space-y-3">
            {draft.teamMembers.map((member, index) => (
              <RowShell
                key={index}
                title={`Osoba ${index + 1}`}
                onRemove={() =>
                  onChange({
                    teamMembers: draft.teamMembers.filter((_, i) => i !== index),
                  })
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`team-name-${index}`}>Imię i nazwisko</Label>
                    <Input
                      id={`team-name-${index}`}
                      value={member.name}
                      onChange={(event) => updateTeamMember(index, { name: event.target.value })}
                      placeholder="Np. Anna Kowalska"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`team-role-${index}`}>Rola w projekcie</Label>
                    <Input
                      id={`team-role-${index}`}
                      value={member.role}
                      onChange={(event) => updateTeamMember(index, { role: event.target.value })}
                      placeholder="Np. koordynatorka"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`team-org-${index}`}>Organizacja</Label>
                    <Input
                      id={`team-org-${index}`}
                      value={member.organization}
                      onChange={(event) =>
                        updateTeamMember(index, { organization: event.target.value })
                      }
                      placeholder="Np. fundacja"
                    />
                  </div>
                </div>
              </RowShell>
            ))}
          </ul>
        ) : null}
        <AddButton
          label="Dodaj osobę"
          onClick={() =>
            onChange({
              teamMembers: [...draft.teamMembers, { name: "", role: "", organization: "" }],
            })
          }
        />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Partnerzy</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Organizacje i instytucje, które pomogą wdrożyć rozwiązanie.
          </p>
        </div>
        {draft.partners.length > 0 ? (
          <ul className="space-y-3">
            {draft.partners.map((partner, index) => (
              <RowShell
                key={index}
                title={`Partner ${index + 1}`}
                onRemove={() =>
                  onChange({ partners: draft.partners.filter((_, i) => i !== index) })
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`partner-name-${index}`}>Nazwa organizacji</Label>
                    <Input
                      id={`partner-name-${index}`}
                      value={partner.name}
                      onChange={(event) => updatePartner(index, { name: event.target.value })}
                      placeholder="Np. Gminny Ośrodek Pomocy Społecznej"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`partner-desc-${index}`}>Rola partnera</Label>
                    <Input
                      id={`partner-desc-${index}`}
                      value={partner.description}
                      onChange={(event) =>
                        updatePartner(index, { description: event.target.value })
                      }
                      placeholder="Np. rekrutacja uczestników"
                    />
                  </div>
                </div>
              </RowShell>
            ))}
          </ul>
        ) : null}
        <AddButton
          label="Dodaj partnera"
          onClick={() => onChange({ partners: [...draft.partners, { name: "", description: "" }] })}
        />
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-base font-medium">Koszty i zasoby</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Wypisz najważniejsze koszty, które trzeba pokryć.
          </p>
        </div>
        {draft.costs.length > 0 ? (
          <ul className="space-y-3">
            {draft.costs.map((cost, index) => (
              <RowShell
                key={index}
                title={`Koszt ${index + 1}`}
                onRemove={() => onChange({ costs: draft.costs.filter((_, i) => i !== index) })}
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor={`cost-name-${index}`}>Nazwa kosztu</Label>
                    <Input
                      id={`cost-name-${index}`}
                      value={cost.name}
                      onChange={(event) => updateCost(index, { name: event.target.value })}
                      placeholder="Np. szkolenie wolontariuszy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`cost-amount-${index}`}>Kwota (zł)</Label>
                    <Input
                      id={`cost-amount-${index}`}
                      inputMode="decimal"
                      value={cost.amount}
                      onChange={(event) => updateCost(index, { amount: event.target.value })}
                      placeholder="Np. 3000"
                    />
                  </div>
                  <RadioChipGroup
                    legend="Rodzaj"
                    name={`cost-type-${index}`}
                    options={COST_TYPE_OPTIONS.map((option) => ({ ...option }))}
                    value={cost.type}
                    onChange={(value) => updateCost(index, { type: value })}
                  />
                </div>
              </RowShell>
            ))}
          </ul>
        ) : null}
        <AddButton
          label="Dodaj koszt"
          onClick={() =>
            onChange({
              costs: [...draft.costs, { name: "", type: "fixed", amount: "" }],
            })
          }
        />
      </div>

      <CountedTextarea
        id="creator-team-experience"
        label="Doświadczenie zespołu"
        value={draft.teamExperience}
        onChange={(value) => onChange({ teamExperience: value })}
        placeholder="Np. od 3 lat prowadzimy klub seniora i współpracujemy z lokalnymi organizacjami…"
      />
    </>
  )
}
