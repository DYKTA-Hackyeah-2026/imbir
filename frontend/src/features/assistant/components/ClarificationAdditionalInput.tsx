export function ClarificationAdditionalInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor="assistant-clarification-extra" className="text-base font-medium">
        Dodatkowe informacje{" "}
        <span className="text-muted-foreground text-sm font-normal">(opcjonalnie)</span>
      </label>
      <textarea
        id="assistant-clarification-extra"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={3}
        placeholder="Możesz dopisać coś od siebie…"
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full resize-y rounded-lg border px-3 py-2 text-base outline-none focus-visible:ring-3 disabled:opacity-60 md:text-sm dark:bg-input/30"
      />
    </div>
  )
}
