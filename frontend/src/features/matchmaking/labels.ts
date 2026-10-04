import type {
  AudienceId,
  EvidenceLevel,
  NeedTag,
  RelevanceLevel,
  SourceKind,
} from "./types"

export const RELEVANCE_LABELS: Record<
  RelevanceLevel,
  { label: string; description: string; tone: "strong" | "good" | "ok" | "weak" }
> = {
  "bardzo-trafne": {
    label: "Bardzo trafne dopasowanie",
    description: "Opis potrzeby i profil grupy w dużej mierze pokrywają się z tą innowacją.",
    tone: "strong",
  },
  trafne: {
    label: "Trafne dopasowanie",
    description: "Kilka istotnych elementów potrzeby odpowiada temu rozwiązaniu.",
    tone: "good",
  },
  mozliwe: {
    label: "Możliwe dopasowanie",
    description: "Część warunków się zgadza, ale wymaga to potwierdzenia.",
    tone: "ok",
  },
  slabe: {
    label: "Wymaga weryfikacji",
    description: "Podobieństwo jest ograniczone. Sprawdź szczegóły przed decyzją.",
    tone: "weak",
  },
}

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  silne: "Silne podstawy źródłowe",
  umiarkowane: "Umiarkowane podstawy źródłowe",
  slabe: "Ograniczone podstawy źródłowe",
  brak: "Brak danych źródłowych",
}

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  "dokumentacja-projektu": "Dokumentacja projektu",
  "raport-ewaluacyjny": "Raport ewaluacyjny",
  "baza-innowacji": "Baza innowacji społecznych",
  publikacja: "Publikacja",
}

export const AUDIENCE_LABELS: Record<AudienceId, string> = {
  seniorzy: "Osoby starsze",
  "osoby-z-niepelnosprawnosciami": "Osoby z niepełnosprawnościami",
  "dzieci-i-mlodziez": "Dzieci i młodzież",
  rodziny: "Rodziny",
  "osoby-w-kryzysie": "Osoby w kryzysie",
  "osoby-bezdomne": "Osoby bezdomne",
  "migranci-i-uchodzcy": "Migranci i uchodźcy",
  "osoby-z-ukrainy": "Osoby z Ukrainy",
  "spolecznosc-lokalna": "Społeczność lokalna",
  "organizacje-pozarzadowe": "Organizacje pozarządowe",
  "samorzad-lokalny": "Samorząd lokalny",
  "szkoly-i-placowki": "Szkoły i placówki",
  "osoby-bezrobotne": "Osoby bezrobotne",
  wolontariusze: "Wolontariusze",
}

export const NEED_TAG_LABELS: Record<NeedTag, string> = {
  samotnosc: "Samotność",
  "izolacja-seniorow": "Izolacja osób starszych",
  "wykluczenie-cyfrowe": "Wykluczenie cyfrowe",
  transport: "Transport",
  mobilnosc: "Mobilność",
  "wsparcie-psychologiczne": "Wsparcie psychologiczne",
  "zdrowie-psychiczne": "Zdrowie psychiczne",
  "aktywizacja-zawodowa": "Aktywizacja zawodowa",
  bezrobocie: "Bezrobocie",
  "kompetencje-cyfrowe": "Kompetencje cyfrowe",
  edukacja: "Edukacja",
  "wsparcie-rodzin": "Wsparcie rodzin",
  "przemoc-domowa": "Przemoc domowa",
  bezdomnosc: "Bezdomność",
  mieszkalnictwo: "Mieszkalnictwo",
  "integracja-migrantow": "Integracja migrantów",
  wolontariat: "Wolontariat",
  partycypacja: "Partycypacja społeczna",
  "uslugi-spoleczne": "Usługi społeczne",
  "opieka-dlugoterminowa": "Opieka długoterminowa",
  "aktywnosc-fizyczna": "Aktywność fizyczna",
  kultura: "Kultura",
  ekologia: "Ekologia",
  "wsparcie-sasiedzkie": "Wsparcie sąsiedzkie",
  "pomoc-zywnosciowa": "Pomoc żywnościowa",
  "wsparcie-dla-ukrainy": "Wsparcie dla osób z Ukrainy",
  "piecza-zastepcza": "Piecza zastępcza",
  uzaleznienia: "Uzależnienia",
  "przedsiebiorczosc-spoleczna": "Przedsiębiorczość społeczna",
  dostępnosc: "Dostępność",
}

export const EVIDENCE_TONE: Record<EvidenceLevel, "strong" | "good" | "ok" | "weak"> = {
  silne: "strong",
  umiarkowane: "good",
  slabe: "ok",
  brak: "weak",
}
