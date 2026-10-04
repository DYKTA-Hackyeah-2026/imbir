export function DataValue({ value }: { value: string | null | undefined }) {
  if (!value || !value.trim()) {
    return <span className="text-muted-foreground italic">Brak danych</span>
  }
  return <span>{value}</span>
}
