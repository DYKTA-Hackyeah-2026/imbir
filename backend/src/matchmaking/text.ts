/**
 * Lightweight Polish text utilities. They are deliberately dependency free and
 * deterministic so the service keeps working without any external AI provider.
 */

const DIACRITICS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

const STOPWORDS = new Set([
  'aby', 'albo', 'ale', 'ale', 'albowiem', 'bez', 'bo', 'bowiem', 'by', 'byc', 'bycia', 'byc',
  'byla', 'bylo', 'byly', 'byl', 'ci', 'co', 'cos', 'czy', 'dla', 'do', 'dosyc', 'gdy', 'gdyby',
  'gdyz', 'gdzie', 'go', 'i', 'ich', 'ile', 'im', 'innych', 'iz', 'ja', 'jak', 'jaka', 'jakas',
  'jakie', 'jakis', 'jako', 'je', 'jeden', 'jedna', 'jedno', 'jego', 'jej', 'jest', 'jesli',
  'jeszcze', 'jezeli', 'juz', 'kazdy', 'kiedy', 'kto', 'ktora', 'ktore', 'ktorego', 'ktorej',
  'ktory', 'ktorych', 'ktorzy', 'lat', 'lub', 'ma', 'maja', 'mi', 'miedzy', 'mnie', 'moga',
  'moze', 'mozna', 'mu', 'my', 'na', 'nad', 'nam', 'nas', 'nasz', 'nasza', 'nasze', 'natomiast',
  'nic', 'nie', 'nich', 'niej', 'nim', 'nimi', 'niz', 'no', 'o', 'od', 'okolo', 'on', 'ona',
  'one', 'oni', 'ono', 'oraz', 'pan', 'pana', 'po', 'pod', 'podczas', 'ponad', 'poniewaz',
  'poza', 'przed', 'przez', 'przy', 'raz', 'roku', 'rowniez', 'sa', 'sam', 'sie', 'siebie',
  'soba', 'sposob', 'swoje', 'ta', 'tak', 'taka', 'takie', 'takze', 'tam', 'te', 'tego', 'tej',
  'temu', 'ten', 'teraz', 'tez', 'to', 'toba', 'tu', 'tutaj', 'twoj', 'twoja', 'twoje', 'ty',
  'tych', 'tylko', 'tym', 'u', 'w', 'we', 'wiec', 'wlasnie', 'wobec', 'wszystkie', 'wszystko',
  'wtedy', 'z', 'za', 'zawsze', 'ze', 'zeby', 'zesz', 'ze', 'znow', 'znowu', 'znaczy', 'zostac',
  'jego', 'ktoregos', 'ktorejs', 'ktoremu', 'ktoryms', 'sie', 'sie', 'takie', 'taki', 'tyle',
]);

export function foldDiacritics(value: string): string {
  let out = '';
  for (const char of value.toLowerCase()) {
    out += DIACRITICS[char] ?? char;
  }
  return out;
}

export function normalizeText(value: string): string {
  return foldDiacritics(value)
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token) && !/^\d+$/.test(token));
}

/** Simple Polish suffix trimming so inflected forms still overlap. */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  for (const suffix of [
    'ami',
    'ach',
    'ego',
    'emu',
    'owa',
    'owe',
    'owy',
    'ych',
    'ich',
    'iej',
    'ami',
    'em',
    'om',
    'ow',
    'ie',
    'ej',
    'ym',
    'im',
    'a',
    'e',
    'i',
    'o',
    'u',
    'y',
  ]) {
    if (token.length - suffix.length >= 3 && token.endsWith(suffix)) {
      return token.slice(0, token.length - suffix.length);
    }
  }
  return token;
}

export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stem);
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Deterministic hashed bag-of-words embedding (L2 normalised). This is an
 * offline stand-in for a real embedding model; it preserves lexical similarity
 * which is enough for a small, curated catalogue.
 */
export function hashEmbedding(value: string, dimensions: number): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const counts = new Map<string, number>();
  for (const token of tokenize(value)) {
    const key = stem(token);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [token, count] of counts) {
    const weight = 1 + Math.log(count);
    const index = hashString(token) % dimensions;
    const sign = hashString(`s:${token}`) % 2 === 0 ? 1 : -1;
    vector[index] += sign * weight;
  }
  const norm = Math.sqrt(vector.reduce((sum, value2) => sum + value2 * value2, 0));
  if (norm === 0) return vector;
  return vector.map((value2) => value2 / norm);
}

export function lexicalOverlap(queryTokens: readonly string[], documentTokens: readonly string[]): number {
  if (queryTokens.length === 0 || documentTokens.length === 0) return 0;
  const query = new Set(stemTokens([...queryTokens]));
  const document = new Set(stemTokens([...documentTokens]));
  let shared = 0;
  for (const token of query) {
    if (document.has(token)) shared += 1;
  }
  const denominator = Math.sqrt(query.size * document.size);
  return denominator === 0 ? 0 : shared / denominator;
}

export function truncate(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = normalizeText(value);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

export { STOPWORDS };
