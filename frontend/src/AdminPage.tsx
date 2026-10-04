import { useEffect, useState, type FormEvent } from "react"
import {
  Database,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Star,
  Trash2,
  Zap,
} from "lucide-react"

import AppHeader from "@/components/AppHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  adminCreateSpace,
  adminDeleteEntry,
  adminDeleteSpace,
  adminEntries,
  adminMoveSpace,
  adminOverview,
  adminPurge,
  adminSpaceAction,
  adminUpdateSettings,
  adminUpdateSpace,
  errorMessage,
  type CacheEntry,
  type Overview,
  type Space,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type Tab = "overview" | "spaces" | "settings" | "entries"

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Przegląd" },
  { id: "spaces", label: "Przestrzenie" },
  { id: "settings", label: "Ustawienia" },
  { id: "entries", label: "Wpisy" },
]

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "active"
  const label = active ? "aktywna" : "wstrzymana"
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      {label}
    </span>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview")
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const [newSpace, setNewSpace] = useState({
    name: "",
    description: "",
    isDefault: false,
  })

  const [settingsForm, setSettingsForm] = useState({
    default_model: "",
    force_model: "",
    cache_ttl_seconds: "0",
    upstream_base_url: "",
  })

  const [entrySpace, setEntrySpace] = useState("")
  const [entries, setEntries] = useState<CacheEntry[]>([])
  const [entriesTotal, setEntriesTotal] = useState(0)
  const [entriesLoading, setEntriesLoading] = useState(false)

  async function load() {
    setLoading(true)
    setError("")
    try {
      setOverview(await adminOverview())
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    document.title = "Administracja · Małopolski Hub Innowacji Społecznych"
    void load()
  }, [])

  useEffect(() => {
    if (!overview) return
    const settings = overview.settings
    setSettingsForm({
      default_model: settings.default_model ?? "",
      force_model: settings.force_model ?? "",
      cache_ttl_seconds: String(settings.cache_ttl_seconds ?? 0),
      upstream_base_url: settings.upstream_base_url ?? "",
    })
  }, [overview])

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await action()
      if (successMessage) setNotice(successMessage)
      await load()
      return true
    } catch (caught) {
      setError(errorMessage(caught))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateSpace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newSpace.name.trim()) return
    const ok = await run(
      () =>
        adminCreateSpace({
          name: newSpace.name.trim(),
          description: newSpace.description.trim() || undefined,
          isDefault: newSpace.isDefault || undefined,
        }),
      "Przestrzeń została utworzona.",
    )
    if (ok) setNewSpace({ name: "", description: "", isDefault: false })
  }

  async function handleSaveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await run(
      () =>
        adminUpdateSettings({
          default_model: settingsForm.default_model.trim() || null,
          force_model: settingsForm.force_model.trim() || null,
          cache_ttl_seconds: Number(settingsForm.cache_ttl_seconds) || 0,
          upstream_base_url: settingsForm.upstream_base_url.trim(),
        }),
      "Ustawienia zostały zapisane.",
    )
  }

  function handleMove(space: Space) {
    const target = window.prompt(
      `Przenieść wpisy z „${space.name}” do której przestrzeni? Podaj nazwę docelową.`,
    )
    if (!target?.trim()) return
    void run(
      () => adminMoveSpace(space.id, { targetName: target.trim() }),
      `Przeniesiono wpisy z „${space.name}”.`,
    )
  }

  function handleDeleteSpace(space: Space) {
    if (!window.confirm(`Usunąć przestrzeń pamięci „${space.name}”?`)) return
    void run(() => adminDeleteSpace(space.id), "Przestrzeń została usunięta.")
  }

  async function loadEntries() {
    setEntriesLoading(true)
    setError("")
    try {
      const page = await adminEntries({
        spaceId: entrySpace || undefined,
        limit: 50,
      })
      setEntries(page.rows)
      setEntriesTotal(page.total)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setEntriesLoading(false)
    }
  }

  useEffect(() => {
    if (tab === "entries") void loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, entrySpace])

  async function handlePurge(expired: boolean) {
    if (expired) {
      if (!window.confirm("Wyczyścić wszystkie wygasłe wpisy pamięci?")) return
      await run(
        () => adminPurge({ expired: true }),
        "Wygasłe wpisy zostały wyczyszczone.",
      )
      void loadEntries()
      return
    }
    if (!entrySpace) {
      setError("Wybierz przestrzeń do wyczyszczenia.")
      return
    }
    if (!window.confirm("Wyczyścić wszystkie wpisy w wybranej przestrzeni?"))
      return
    await run(() => adminPurge({ spaceId: entrySpace }), "Przestrzeń została wyczyszczona.")
    void loadEntries()
  }

  const spaces = overview?.spaces ?? []
  const spaceNameById = new Map(spaces.map((space) => [space.id, space.name]))

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  tab === item.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            <RefreshCw
              aria-hidden="true"
              className={cn(loading && "animate-spin")}
            />
            Odśwież
          </Button>
        </div>

        {error ? (
          <p
            role="alert"
            className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
          >
            {notice}
          </p>
        ) : null}

        {loading && !overview ? (
          <div className="text-muted-foreground flex items-center gap-2 p-8 text-sm">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Wczytywanie danych administracyjnych…
          </div>
        ) : null}

        {overview && tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Wpisy w pamięci" value={overview.totals.entries} />
              <StatCard label="Trafienia pamięci" value={overview.totals.hits} />
              <StatCard label="Tokeny" value={overview.totals.tokens} />
            </div>

            <Card className="gap-3 p-4">
              <h2 className="font-medium">Ostatnie 24 godziny</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(overview.eventsLast24h).map(([key, value]) => (
                  <span
                    key={key}
                    className="bg-muted inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                  >
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </span>
                ))}
              </div>
            </Card>

            <Card className="gap-3 p-4">
              <h2 className="font-medium">Aktywna konfiguracja</h2>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Model</dt>
                  <dd className="font-mono break-all">
                    {overview.effective.model ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Wymuszony model</dt>
                  <dd className="font-mono break-all">
                    {overview.effective.forcedModel ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">TTL (sekundy)</dt>
                  <dd>{overview.effective.ttlSeconds}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Adres bazowy upstream</dt>
                  <dd className="font-mono break-all">
                    {overview.effective.upstreamBaseUrl ?? "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
        ) : null}

        {overview && tab === "spaces" ? (
          <div className="space-y-4">
            <Card className="gap-4 p-4">
              <h2 className="font-medium">Utwórz przestrzeń</h2>
              <form
                onSubmit={handleCreateSpace}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
              >
                <div className="space-y-2">
                  <Label htmlFor="space-name">Nazwa</Label>
                  <Input
                    id="space-name"
                    value={newSpace.name}
                    onChange={(event) =>
                      setNewSpace((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="eksperyment-a"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="space-description">Opis</Label>
                  <Input
                    id="space-description"
                    value={newSpace.description}
                    onChange={(event) =>
                      setNewSpace((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Opcjonalnie"
                  />
                </div>
                <Button type="submit" disabled={busy || !newSpace.name.trim()}>
                  Utwórz
                </Button>
              </form>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newSpace.isDefault}
                  onChange={(event) =>
                    setNewSpace((prev) => ({
                      ...prev,
                      isDefault: event.target.checked,
                    }))
                  }
                  className="border-input accent-primary size-4 rounded"
                />
                Ustaw jako domyślną przestrzeń
              </label>
            </Card>

            <div className="space-y-3">
              {spaces.map((space) => (
                <Card key={space.id} className="gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{space.name}</span>
                        <StatusBadge status={space.status} />
                        {space.isDefault ? (
                          <span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
                            <Star aria-hidden="true" className="size-3" />
                            domyślna
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {space.description ?? "Brak opisu"}
                      </p>
                    </div>
                    <div className="text-muted-foreground flex gap-4 text-sm tabular-nums">
                      <span>{space.entries} wpisów</span>
                      <span>{space.hits} trafień</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {space.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adminSpaceAction(space.id, "pause"),
                            "Przestrzeń wstrzymana.",
                          )
                        }
                      >
                        <Pause aria-hidden="true" />
                        Wstrzymaj
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adminSpaceAction(space.id, "resume"),
                            "Przestrzeń wznowiona.",
                          )
                        }
                      >
                        <Play aria-hidden="true" />
                        Wznów
                      </Button>
                    )}
                    {!space.isDefault ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adminSpaceAction(space.id, "default"),
                            "Domyślna przestrzeń została zaktualizowana.",
                          )
                        }
                      >
                        <Star aria-hidden="true" />
                        Ustaw domyślną
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || spaces.length < 2}
                      onClick={() =>
                        void run(
                          () =>
                            adminUpdateSpace(space.id, {
                              name:
                                window.prompt("Nowa nazwa", space.name) ??
                                space.name,
                            }),
                          "Nazwa przestrzeni została zmieniona.",
                        )
                      }
                    >
                      Zmień nazwę
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || spaces.length < 2}
                      onClick={() => handleMove(space)}
                    >
                      Przenieś wpisy
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy || spaces.length < 2}
                      onClick={() => handleDeleteSpace(space)}
                    >
                      <Trash2 aria-hidden="true" />
                      Usuń
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {tab === "settings" ? (
          <Card className="gap-4 p-4">
            <h2 className="font-medium">Ustawienia pamięci podręcznej</h2>
            <form onSubmit={handleSaveSettings} className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="default-model">Domyślny model</Label>
                <Input
                  id="default-model"
                  value={settingsForm.default_model}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      default_model: event.target.value,
                    }))
                  }
                  placeholder="inclusionai/ling-3.1-flash"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="force-model">Wymuszony model</Label>
                <Input
                  id="force-model"
                  value={settingsForm.force_model}
                  onChange={(event) =>
                    setSettingsForm((prev) => ({
                      ...prev,
                      force_model: event.target.value,
                    }))
                  }
                  placeholder="Pozostaw puste, aby nie wymuszać modelu"
                />
                <p className="text-muted-foreground text-xs">
                  Gdy jest ustawiony, każde zapytanie czatu używa tego modelu
                  niezależnie od tego, co wyśle klient.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ttl">TTL pamięci (sekundy)</Label>
                  <Input
                    id="ttl"
                    type="number"
                    min={0}
                    value={settingsForm.cache_ttl_seconds}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        cache_ttl_seconds: event.target.value,
                      }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Użyj 0, aby wyłączyć wygasanie.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upstream">Adres bazowy upstream</Label>
                  <Input
                    id="upstream"
                    value={settingsForm.upstream_base_url}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        upstream_base_url: event.target.value,
                      }))
                    }
                    placeholder="https://openrouter.ai/api/v1"
                  />
                </div>
              </div>
              <div>
                <Button type="submit" disabled={busy}>
                  Zapisz ustawienia
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

        {tab === "entries" ? (
          <div className="space-y-4">
            <Card className="gap-3 p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="entry-space">Przestrzeń</Label>
                  <select
                    id="entry-space"
                    value={entrySpace}
                    onChange={(event) => setEntrySpace(event.target.value)}
                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
                  >
                    <option value="">Wszystkie przestrzenie ({entriesTotal})</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>
                        {space.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void loadEntries()}
                  disabled={entriesLoading}
                >
                  <Database aria-hidden="true" />
                  Wczytaj
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handlePurge(false)}
                  disabled={busy || !entrySpace}
                >
                  <Zap aria-hidden="true" />
                  Wyczyść przestrzeń
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void handlePurge(true)}
                  disabled={busy}
                >
                  <Trash2 aria-hidden="true" />
                  Wyczyść wygasłe
                </Button>
              </div>
            </Card>

            {entriesLoading ? (
              <div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Wczytywanie wpisów…
              </div>
            ) : entries.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                Nie znaleziono wpisów w pamięci podręcznej.
              </p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <Card key={entry.id} className="gap-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <code className="text-xs break-all">{entry.id}</code>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        aria-label="Usuń wpis"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adminDeleteEntry(entry.id),
                            "Wpis został usunięty.",
                          ).then(() => loadEntries())
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      {Object.entries(entry)
                        .filter(
                          ([key]) =>
                            key !== "id" &&
                            key !== "requestBody" &&
                            key !== "responseBody",
                        )
                        .slice(0, 6)
                        .map(([key, value]) => {
                          const text =
                            key === "spaceId" || key === "space_id"
                              ? (spaceNameById.get(String(value)) ??
                                String(value))
                              : typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)
                          return (
                            <span key={key} className="max-w-full truncate">
                              <span className="font-medium">{key}:</span>{" "}
                              {text.length > 160 ? `${text.slice(0, 160)}…` : text}
                            </span>
                          )
                        })}
                    </div>
                    <details className="text-muted-foreground text-xs">
                      <summary className="cursor-pointer select-none">
                        Surowy JSON
                      </summary>
                      <pre className="bg-muted/50 mt-1 max-h-64 overflow-auto rounded-md p-2">
                        {JSON.stringify(entry, null, 2)}
                      </pre>
                    </details>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
