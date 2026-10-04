import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, FlaskConical, RefreshCw } from "lucide-react"
import type { ServiceScenario } from "../types"

const SCENARIOS: { value: ServiceScenario; label: string; description: string }[] = [
  {
    value: "normal",
    label: "Zwykłe działanie",
    description: "Usługa zwraca dopasowane innowacje.",
  },
  {
    value: "no-match",
    label: "Brak dopasowania",
    description: "Pokazuje stan, gdy nie ma trafnych rozwiązań.",
  },
  {
    value: "incomplete",
    label: "Niepełne dane źródłowe",
    description: "Ogranicza wyniki do innowacji o słabszych podstawach.",
  },
  {
    value: "failure",
    label: "Awaria usługi",
    description: "Symuluje chwilowy błąd i stan ponowienia.",
  },
]

export function DemoPanel({
  scenario,
  onChange,
  onRerun,
  canRerun,
}: {
  scenario: ServiceScenario
  onChange: (scenario: ServiceScenario) => void
  onRerun: () => void
  canRerun: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <section
      className="rounded-xl border border-dashed border-violet-500/40 bg-violet-500/5"
      aria-labelledby="demo-panel-heading"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-expanded={open}
        aria-controls="demo-panel-content"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 font-medium">
          <FlaskConical aria-hidden="true" className="size-4 text-violet-700" />
          <span id="demo-panel-heading">Panel demonstracyjny</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div id="demo-panel-content" className="space-y-4 border-t border-violet-500/20 p-4">
          <p className="text-sm text-muted-foreground">
            Ten panel służy do prezentacji różnych sytuacji. Wybierz stan i uruchom
            wyszukiwanie ponownie, aby go zobaczyć.
          </p>
          <fieldset className="space-y-2">
            <legend className="sr-only">Wybierz stan usługi</legend>
            {SCENARIOS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-background/60 px-3 py-2.5 transition-colors has-checked:border-primary has-checked:bg-primary/5 hover:bg-muted/60"
              >
                <input
                  type="radio"
                  name="demo-scenario"
                  value={option.value}
                  checked={scenario === option.value}
                  onChange={() => onChange(option.value)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRerun}
            disabled={!canRerun}
          >
            <RefreshCw aria-hidden="true" />
            Uruchom wyszukiwanie ponownie
          </Button>
        </div>
      ) : null}
    </section>
  )
}
