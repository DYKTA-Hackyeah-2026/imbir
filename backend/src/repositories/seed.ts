import type {
  CatalogueCitation,
  CatalogueEvidence,
  CatalogueInnovation,
  CatalogueSource,
} from './types.js';

export const SYNTHETIC_DISCLAIMER =
  'Rekord demonstracyjny (syntetyczny). Nie jest zweryfikowaną innowacją ROPS i nie opisuje rzeczywistego wdrożenia.';

export const SYNTHETIC_CATALOGUE_SOURCE_ID = 'src-synthetic-catalogue';
export const SYNTHETIC_NOTE_SOURCE_ID = 'src-synthetic-note';

/**
 * Configured source locations. `urlVerified` stays false because this build
 * never fetched the pages; a URL here is a pointer, not a content claim.
 */
export const SOURCE_SEED: CatalogueSource[] = [
  {
    id: 'src-library',
    title: 'Biblioteka Innowacji Społecznych ROPS',
    url: 'https://rops.krakow.pl/innowacje-spoleczne/biblioteka-innowacji-spolecznych/kategorie',
    kind: 'innovation_library',
    urlVerified: false,
    synthetic: false,
    description: 'Katalog kandydatów. Treść nie została pobrana w tej instancji.',
  },
  {
    id: 'src-obserwator',
    title: 'Obserwator — statystyki regionalne',
    url: 'https://obserwator.rops.krakow.pl/',
    kind: 'statistics',
    urlVerified: false,
    synthetic: false,
    description: 'Źródło danych kontekstowych. Treść nie została pobrana w tej instancji.',
  },
  {
    id: 'src-reports',
    title: 'Raporty z badań ROPS',
    url: 'https://rops.krakow.pl/badania-analizy-raporty/raporty-z-badan',
    kind: 'report',
    urlVerified: false,
    synthetic: false,
    description: 'Źródło dowodów kontekstowych. Treść nie została pobrana w tej instancji.',
  },
  {
    id: 'src-challenges-map',
    title: 'Mapa Wyzwań Społecznych',
    url: 'https://rops.krakow.pl/mpliki/IS/IWS_20/za._nr_2._Mapa_Wyzwa_Spoecznych.pdf',
    kind: 'challenges_map',
    urlVerified: false,
    synthetic: false,
    description: 'Źródło kontekstu regionalnego. Treść nie została pobrana w tej instancji.',
  },
  {
    id: 'src-publications',
    title: 'Publikacje ze świata innowacji',
    url: 'https://rops.krakow.pl/innowacje-spoleczne/publikacje-ze-swiata-innowacji',
    kind: 'publication',
    urlVerified: false,
    synthetic: false,
    description: 'Materiał edukacyjny, nie rekord innowacji.',
  },
  {
    id: 'src-canvas',
    title: 'Social Innovation Canvas',
    url: 'https://rops.krakow.pl/mpliki/IS/Moj_folder/INNO_AGH_-_SOCIAL_CANVAS.pdf',
    kind: 'canvas',
    urlVerified: false,
    synthetic: false,
    description: 'Narzędzie planistyczne, nie rekord innowacji.',
  },
  {
    id: SYNTHETIC_CATALOGUE_SOURCE_ID,
    title: 'Katalog demonstracyjny (syntetyczny)',
    url: undefined,
    kind: 'synthetic_catalogue',
    urlVerified: false,
    synthetic: true,
    description:
      'Zbiór fikcyjnych rekordów służących wyłącznie do demonstracji działania usługi. Nie pochodzi z ROPS.',
  },
  {
    id: SYNTHETIC_NOTE_SOURCE_ID,
    title: 'Notatka demonstracyjna (syntetyczna)',
    url: undefined,
    kind: 'synthetic_note',
    urlVerified: false,
    synthetic: true,
    description: 'Syntetyczne uzasadnienie dołączone do rekordów demonstracyjnych.',
  },
];

function syntheticCitation(innovationId: string): CatalogueCitation {
  return {
    innovationId,
    sourceId: SYNTHETIC_NOTE_SOURCE_ID,
    title: 'Notatka demonstracyjna (syntetyczna)',
    excerpt: SYNTHETIC_DISCLAIMER,
  };
}

/**
 * Demonstration-only innovations. These are fabricated for the demo and are
 * labelled `synthetic` in every response. They are not real ROPS innovations.
 */
export const INNOVATION_SEED: CatalogueInnovation[] = [
  {
    id: 'syn-senior-neighborhood',
    title: 'Sąsiedzkie Centra Wsparcia Seniorów',
    summary:
      'Lokalne punkty w których wolontariusze i sąsiedzi pomagają seniorom w codziennych sprawach i przeciwdziałają samotności.',
    description:
      'Model zakłada tworzenie stałych punktów sąsiedzkich, w których starsze osoby mogą spotkać się, uzyskać pomoc w załatwianiu spraw oraz wziąć udział w zajęciach towarzyskich. Kluczowa jest współpraca z lokalnymi organizacjami i koordynatora ds. seniorów.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['senior_loneliness', 'volunteering_community', 'digital_exclusion'],
    targetGroups: ['Seniorzy', 'Osoby starsze mieszkające samotnie'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['obszar miejski', 'obszar wiejski', 'gmina'],
    prerequisites: ['Lokal do prowadzenia punktu', 'Koordynator lub lider lokalny'],
    resourcesRequired: ['Wolontariusze', 'Pomieszczenie', 'Współpraca z NGO'],
    estimatedCostPln: null,
    timeframeWeeks: 24,
  },
  {
    id: 'syn-youth-mentor',
    title: 'Mentoring rówieśniczy dla młodzieży',
    summary:
      'Program w którym starsi uczniowie wspierają młodszych w nauce i w trudnych sytuacjach, pod opieką pedagoga.',
    description:
      'Program łączy młodzież w pary mentorskie i oferuje regularne spotkania, warsztaty kompetencji społecznych oraz superwizję dla mentorów. Celem jest wzmocnienie poczucia sprawczości i ograniczenie wykluczenia rówieśniczego.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['children_youth', 'education_competences', 'mental_health'],
    targetGroups: ['Dzieci i młodzież', 'Uczniowie szkół podstawowych'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['szkoła', 'obszar miejski', 'obszar wiejski'],
    prerequisites: ['Zgoda szkoły', 'Opieka pedagoga lub psychologa'],
    resourcesRequired: ['Koordynator', 'Sala', 'Materiały warsztatowe'],
    estimatedCostPln: null,
    timeframeWeeks: 32,
  },
  {
    id: 'syn-disability-assistant',
    title: 'Lokalny bank asystentów osób z niepełnosprawnościami',
    summary:
      'Koordynowany zespół asystentów wspierających osoby z niepełnosprawnościami w codziennym funkcjonowaniu i aktywności.',
    description:
      'Usługa polega na dopasowaniu asystenta do potrzeb osoby i organizowaniu wsparcia w dojazdach, sprawach urzędowych oraz aktywności społecznej. Model wymaga szkoleń i jasnych zasad etycznych.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['disability_accessibility', 'poverty_exclusion', 'volunteering_community'],
    targetGroups: ['Osoby z niepełnosprawnościami', 'Osoby z ograniczoną samodzielnością'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['gmina', 'powiat', 'obszar miejski', 'obszar wiejski'],
    prerequisites: ['Szkolenie asystentów', 'Zasady ochrony danych i godności'],
    resourcesRequired: ['Asystenci', 'Koordynator', 'Transport'],
    estimatedCostPln: null,
    timeframeWeeks: 16,
  },
  {
    id: 'syn-family-support-point',
    title: 'Punkt wsparcia rodzin w środowisku lokalnym',
    summary:
      'Miejsce pierwszej pomocy dla rodzin, łączące poradnictwo, grupy wsparcia i pomoc w kryzysie.',
    description:
      'Punkt oferuje rozmowę ze specjalistą, grupy wsparcia dla rodziców oraz informację o dalszych formach pomocy. Działa w partnerstwie z instytucjami pomocy społecznej.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['family_support', 'poverty_exclusion', 'mental_health'],
    targetGroups: ['Rodziny', 'Rodzice', 'Osoby w kryzysie'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['gmina', 'obszar miejski', 'obszar wiejski'],
    prerequisites: ['Partnerstwo z instytucjami', 'Specjalista dyżurujący'],
    resourcesRequired: ['Specjaliści', 'Pomieszczenie', 'Informacja lokalna'],
    estimatedCostPln: null,
    timeframeWeeks: 20,
  },
  {
    id: 'syn-digital-club',
    title: 'Klub cyfrowy dla seniorów i osób wykluczonych cyfrowo',
    summary:
      'Zajęcia i punkt pomocy w obsłudze komputera, smartfona i usług online dla osób zagrożonych wykluczeniem cyfrowym.',
    description:
      'Klub łączy naukę obsługi urządzeń z pomocą w załatwianiu spraw online oraz przeciwdziałaniem oszustwom. Zajęcia prowadzą przeszkoleni wolontariusze.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['digital_exclusion', 'senior_loneliness', 'education_competences'],
    targetGroups: ['Seniorzy', 'Osoby wykluczone cyfrowo'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['biblioteka', 'świetlica', 'obszar miejski', 'obszar wiejski'],
    prerequisites: ['Sprzęt komputerowy', 'Przeszkoleni wolontariusze'],
    resourcesRequired: ['Komputery', 'Wolontariusze', 'Pomieszczenie'],
    estimatedCostPln: null,
    timeframeWeeks: 12,
  },
  {
    id: 'syn-migrant-integration',
    title: 'Międzykulturowe świetlice integracyjne',
    summary:
      'Świetlice dla dzieci i rodzin migranckich łączące naukę języka z zajęciami integracyjnymi i wsparciem społecznym.',
    description:
      'Model przewiduje przestrzeń spotkań, naukę języka polskiego, pomoc w kontaktach ze szkołą oraz działania integrujące lokalną społeczność. Wymaga wrażliwości kulturowej i tłumaczy.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['migrant_integration', 'children_youth', 'family_support', 'education_competences'],
    targetGroups: ['Migranci i uchodźcy', 'Dzieci i młodzież', 'Rodziny'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['obszar miejski', 'gmina'],
    prerequisites: ['Tłumacze lub personel wielojęzyczny', 'Wrażliwość kulturowa'],
    resourcesRequired: ['Pomieszczenie', 'Lektorzy', 'Wolontariusze'],
    estimatedCostPln: null,
    timeframeWeeks: 28,
  },
  {
    id: 'syn-social-coop-incubator',
    title: 'Inkubator spółdzielni socjalnych i zatrudnienia wspieranego',
    summary:
      'Wsparcie osób długotrwale bezrobotnych w zakładaniu spółdzielni socjalnych i podejmowaniu zatrudnienia.',
    description:
      'Inkubator prowadzi doradztwo, szkolenia i towarzyszenie w tworzeniu miejsc pracy. Współpracuje z powiatowymi urzędami pracy i pracodawcami.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['unemployment_activation', 'poverty_exclusion', 'education_competences'],
    targetGroups: ['Osoby bezrobotne', 'Osoby długotrwale bezrobotne'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['powiat', 'gmina', 'obszar miejski'],
    prerequisites: ['Współpraca z urzędem pracy', 'Doradcy zawodowi'],
    resourcesRequired: ['Doradcy', 'Finansowanie startowe', 'Partnerzy'],
    estimatedCostPln: null,
    timeframeWeeks: 40,
  },
  {
    id: 'syn-peer-mental-health',
    title: 'Punkty wsparcia psychicznego prowadzone przez rówieśników',
    summary:
      'Bezpieczne miejsca rozmowy dla młodzieży, prowadzone przez przeszkolonych rówieśników pod nadzorem specjalistów.',
    description:
      'Punkty oferują rozmowę i informację o profesjonalnej pomocy, a także działania profilaktyczne. Nadzór specjalisty i zasady bezpieczeństwa są warunkiem koniecznym.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['mental_health', 'children_youth', 'safety_violence'],
    targetGroups: ['Dzieci i młodzież', 'Osoby w kryzysie psychicznym'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['szkoła', 'obszar miejski'],
    prerequisites: ['Nadzór specjalisty', 'Procedury bezpieczeństwa'],
    resourcesRequired: ['Przeszkoleni rówieśnicy', 'Psycholog', 'Sala'],
    estimatedCostPln: null,
    timeframeWeeks: 20,
  },
  {
    id: 'syn-rural-transport',
    title: 'Gminne usługi transportu na żądanie',
    summary:
      'Elastyczny transport organizowany przez gminę, ułatwiający dojazd do lekarza, urzędu i miejsc aktywności.',
    description:
      'Usługa łączy zgłoszenia mieszkańców z dostępnymi kierowcami i wolontariuszami. Wspiera dostępność dla seniorów i osób bez własnego transportu na terenach wiejskich.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['transport_rural', 'senior_loneliness', 'disability_accessibility'],
    targetGroups: ['Seniorzy', 'Mieszkańcy obszarów wiejskich', 'Osoby z niepełnosprawnościami'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['obszar wiejski', 'gmina'],
    prerequisites: ['Zgoda i koordynacja gminy', 'Kierowcy lub wolontariusze'],
    resourcesRequired: ['Kierowcy', 'Pojazd', 'System zgłoszeń'],
    estimatedCostPln: null,
    timeframeWeeks: 18,
  },
  {
    id: 'syn-addiction-outreach',
    title: 'Streetworkingowy zespół profilaktyki uzależnień',
    summary:
      'Zespół docierający do młodzieży zagrożonej uzależnieniami w przestrzeni publicznej i oferujący pomoc.',
    description:
      'Streetworkerzy nawiązują kontakt w miejscach przebywania młodzieży, informują o pomocy i towarzyszą w pierwszych krokach do wsparcia specjalistycznego.',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    synthetic: true,
    evidenceStatus: 'synthetic',
    problemTags: ['addiction', 'children_youth', 'safety_violence'],
    targetGroups: ['Dzieci i młodzież', 'Osoby z uzależnieniami'],
    testedIn: ['(rekord demonstracyjny)'],
    applicableContexts: ['obszar miejski'],
    prerequisites: ['Przeszkoleni streetworkerzy', 'Współpraca z placówkami pomocowymi'],
    resourcesRequired: ['Streetworkerzy', 'Współpraca instytucji'],
    estimatedCostPln: null,
    timeframeWeeks: 30,
  },
];

export const CITATION_SEED: CatalogueCitation[] = INNOVATION_SEED.map((innovation) =>
  syntheticCitation(innovation.id),
);

export const EVIDENCE_SEED: CatalogueEvidence[] = [
  {
    id: 'ev-syn-seniors',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    title: 'Dowód demonstracyjny: samotność seniorów',
    kind: 'synthetic_evidence',
    summary:
      'Treść demonstracyjna (syntetyczna) ilustrująca kontekst samotności seniorów. Nie jest to zweryfikowane ustalenie statystyczne ROPS.',
    synthetic: true,
    problemTags: ['senior_loneliness', 'digital_exclusion', 'transport_rural'],
  },
  {
    id: 'ev-syn-youth',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    title: 'Dowód demonstracyjny: wsparcie młodzieży',
    kind: 'synthetic_evidence',
    summary:
      'Treść demonstracyjna (syntetyczna) ilustrująca kontekst wsparcia młodzieży. Nie jest to zweryfikowane ustalenie ROPS.',
    synthetic: true,
    problemTags: ['children_youth', 'mental_health', 'education_competences'],
  },
  {
    id: 'ev-syn-exclusion',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    title: 'Dowód demonstracyjny: wykluczenie społeczne',
    kind: 'synthetic_evidence',
    summary:
      'Treść demonstracyjna (syntetyczna) ilustrująca kontekst wykluczenia i ubóstwa. Nie jest to zweryfikowane ustalenie ROPS.',
    synthetic: true,
    problemTags: ['poverty_exclusion', 'unemployment_activation', 'family_support'],
  },
  {
    id: 'ev-syn-accessibility',
    sourceId: SYNTHETIC_CATALOGUE_SOURCE_ID,
    title: 'Dowód demonstracyjny: dostępność i integracja',
    kind: 'synthetic_evidence',
    summary:
      'Treść demonstracyjna (syntetyczna) ilustrująca kontekst dostępności i integracji. Nie jest to zweryfikowane ustalenie ROPS.',
    synthetic: true,
    problemTags: ['disability_accessibility', 'migrant_integration', 'housing'],
  },
];
