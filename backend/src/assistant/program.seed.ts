/**
 * Seeds demonstration municipal programs for the assistant so the search and
 * pagination flow can be exercised locally. Idempotent: it only inserts when the
 * programs table is empty.
 *
 * Usage: npm run db:seed:assistant
 */
import { count } from 'drizzle-orm';
import { createAiGateway } from '../ai/index.js';
import { closeDatabase, db } from '../db/index.js';
import { programs } from '../db/schema.js';
import { createEmbeddingProvider } from './embedding.js';
import { PostgresProgramRepository, type ProgramWriteInput } from './program.repository.js';

const SEED_PROGRAMS: ProgramWriteInput[] = [
  {
    title: 'Cyfrowy Senior',
    summary:
      'Bezpłatna pomoc w korzystaniu z telefonu, internetu i usług cyfrowych, w tym paczkomatów i bankowości internetowej.',
    description:
      'Program prowadzi warsztaty i mentoring rówieśniczy dla osób starszych, które chcą nauczyć się obsługi smartfona, internetu, bankowości internetowej i urządzeń codziennego użytku.',
    targetGroups: ['seniorzy', 'osoby z niskimi kompetencjami cyfrowymi'],
    topics: ['wykluczenie cyfrowe', 'seniorzy'],
    problemsAddressed: [
      'obsługa smartfona',
      'korzystanie z internetu',
      'obsługa paczkomatów',
      'bankowość internetowa',
      'usługi cyfrowe',
    ],
    eligibility: { minAge: 60, residentRequired: true },
    eligibilityDescription: 'Program dla mieszkańców gminy w wieku powyżej 60 lat.',
    status: 'active',
  },
  {
    title: 'Aktywni Zawodowo',
    summary: 'Wsparcie w znalezieniu pracy, przekwalifikowaniu i kontakcie z pracodawcami.',
    description:
      'Doradca zawodowy pomaga przygotować dokumenty aplikacyjne, znaleźć oferty pracy oraz zdobyć nowe kwalifikacje na kursach zawodowych.',
    targetGroups: ['osoby bezrobotne', 'osoby poszukujące pracy'],
    topics: ['aktywizacja zawodowa', 'rynek pracy'],
    problemsAddressed: ['brak pracy', 'poszukiwanie pracy', 'przekwalifikowanie'],
    eligibility: { employmentStatus: ['unemployed'] },
    eligibilityDescription: 'Program dla osób bezrobotnych i poszukujących pracy.',
    status: 'active',
  },
  {
    title: 'Wsparcie Mieszkaniowe',
    summary: 'Pomoc dla osób bez domu lub zagrożonych utratą mieszkania.',
    description:
      'Program oferuje miejsca w schronisku, pomoc w uregulowaniu zaległości czynszowych oraz wsparcie w znalezieniu mieszkania socjalnego.',
    targetGroups: ['osoby bezdomne', 'osoby zagrożone eksmisją'],
    topics: ['mieszkalnictwo', 'przeciwdziałanie bezdomności'],
    problemsAddressed: ['bezdomność', 'eksmisja', 'brak miejsca do spania'],
    eligibility: { housingStatus: ['homeless', 'at_risk'] },
    eligibilityDescription: 'Program dla osób bezdomnych i zagrożonych utratą mieszkania.',
    status: 'active',
  },
  {
    title: 'Pomoc Żywnościowa',
    summary: 'Paczki żywnościowe i ciepłe posiłki dla osób w trudnej sytuacji.',
    description:
      'Program zapewnia regularne wsparcie żywnościowe oraz posiłki w jadni, a także pomoc w uzyskaniu dodatkowych świadczeń.',
    targetGroups: ['osoby ubogie', 'rodziny w trudnej sytuacji'],
    topics: ['ubóstwo', 'pomoc społeczna'],
    problemsAddressed: ['brak jedzenia', 'niskie dochody'],
    eligibility: null,
    eligibilityDescription: 'Pomoc dla osób o niskich dochodach, na podstawie wywiadu z pracownikiem socjalnym.',
    status: 'active',
  },
  {
    title: 'Wsparcie Psychologiczne',
    summary: 'Bezpłatne konsultacje psychologiczne i grupy wsparcia.',
    description:
      'Program oferuje indywidualne konsultacje z psychologiem, grupy wsparcia oraz pomoc w kryzysie psychicznym.',
    targetGroups: ['osoby w kryzysie psychicznym', 'osoby potrzebujące wsparcia'],
    topics: ['zdrowie psychiczne', 'wsparcie psychologiczne'],
    problemsAddressed: ['kryzys psychiczny', 'stres', 'samotność'],
    eligibility: null,
    eligibilityDescription: 'Konsultacje dostępne dla mieszkańców, bez skierowania.',
    status: 'active',
  },
  {
    title: 'Asystent Rodziny',
    summary: 'Wsparcie dla rodzin w codziennych sprawach i opiece nad dziećmi.',
    description:
      'Asystent rodziny pomaga w organizacji opieki, kontaktach z instytucjami oraz w rozwiązywaniu trudności wychowawczych.',
    targetGroups: ['rodziny', 'rodzice'],
    topics: ['wsparcie rodziny', 'piecza zastępcza'],
    problemsAddressed: ['trudności wychowawcze', 'opieka nad dziećmi'],
    eligibility: null,
    status: 'active',
  },
  {
    title: 'Pomoc w Dokumentach',
    summary: 'Pomoc w wypełnianiu wniosków i załatwianiu spraw urzędowych.',
    description:
      'Doradca pomaga wypełnić wnioski, skompletować dokumenty i załatwić sprawy w urzędzie, także online.',
    targetGroups: ['seniorzy', 'osoby potrzebujące wsparcia'],
    topics: ['sprawy urzędowe', 'wsparcie administracyjne'],
    problemsAddressed: ['wypełnianie wniosków', 'sprawy urzędowe', 'dokumenty'],
    eligibility: null,
    status: 'active',
  },
];

async function main(): Promise<void> {
  const [row] = await db.select({ value: count(programs.id) }).from(programs);
  if (Number(row?.value ?? 0) > 0) {
    process.stdout.write('[seed:assistant] programs already present, skipping.\n');
    return;
  }

  const embeddings = createEmbeddingProvider(createAiGateway());
  const repository = new PostgresProgramRepository(embeddings);

  process.stdout.write(`[seed:assistant] inserting ${SEED_PROGRAMS.length} programs...\n`);
  for (const program of SEED_PROGRAMS) {
    await repository.createProgram(program);
  }
  process.stdout.write('[seed:assistant] done.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[seed:assistant] failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });
