/** Polish pluralization for counts (1 / 2–4 / 5+). */
export function plural(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (count === 1) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
