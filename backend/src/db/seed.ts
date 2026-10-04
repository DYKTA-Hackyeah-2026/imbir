/**
 * Seeds the content tables with realistic demo data covering every material type,
 * so the frontend has something to render. Idempotent: re-running resets content
 * tables (materials/categories/topics/search terms) but leaves users untouched.
 *
 * Usage: npm run db:seed
 */
import { sql } from 'drizzle-orm';
import { closeDatabase, db } from './index.js';
import {
  categories,
  materialTags,
  materialTopics,
  materials,
  searchTerms,
  topics,
} from './schema.js';
import { SEED_MATERIALS_EXTRA } from './seed.materials.js';
import type { SeedMaterial } from './seed-schema.js';

const IMG = (seed: string, w = 1200) => `https://picsum.photos/seed/${seed}/${w}/675`;
const THUMB = (seed: string) => `https://picsum.photos/seed/${seed}/600/400`;
const FILE = (name: string) => `https://files.hackathon-backend.makonew.com/content/${name}`;

const SEED_CATEGORIES = [
  { slug: 'gotowe-innowacje', name: 'Gotowe innowacje', description: 'Sprawdzone rozwiązania i dobre praktyki.', icon: 'lightbulb', accent: 'blue', sortOrder: 1 },
  { slug: 'raporty-i-publikacje', name: 'Raporty i publikacje', description: 'Analizy, badania i publikacje eksperckie.', icon: 'file-text', accent: 'violet', sortOrder: 2 },
  { slug: 'ucz-sie-i-dzialaj', name: 'Ucz się i działaj', description: 'Poradniki, webinary i listy kontrolne.', icon: 'graduation-cap', accent: 'emerald', sortOrder: 3 },
  { slug: 'webinary', name: 'Webinary', description: 'Nagrania spotkań i warsztatów online.', icon: 'play', accent: 'rose', sortOrder: 4 },
  { slug: 'mapy-wyzwan', name: 'Mapy wyzwań', description: 'Diagnozy lokalnych wyzwań społecznych.', icon: 'map-pin', accent: 'amber', sortOrder: 5 },
  { slug: 'dobra-praktyka', name: 'Dobra praktyka', description: 'Historie i studia przypadków.', icon: 'users', accent: 'teal', sortOrder: 6 },
];

const SEED_TOPICS = [
  { slug: 'seniorzy', name: 'Seniorzy', icon: 'users' },
  { slug: 'zdrowie-psychiczne', name: 'Zdrowie psychiczne', icon: 'heart-pulse' },
  { slug: 'niepelnosprawnosc', name: 'Niepełnosprawność', icon: 'accessibility' },
  { slug: 'wykluczenie-cyfrowe', name: 'Wykluczenie cyfrowe', icon: 'wifi' },
  { slug: 'wolontariat', name: 'Wolontariat', icon: 'users-round' },
  { slug: 'mlodziez', name: 'Młodzież', icon: 'user-round' },
];

const SEED_MATERIALS: SeedMaterial[] = [
  {
    slug: 'cyfrowi-seniorzy-blizej-swiata',
    title: 'Cyfrowi Seniorzy – bliżej świata',
    excerpt: 'Program wspierający osoby starsze w zdobywaniu kompetencji cyfrowych.',
    body: '<p>Program łączy warsztaty stacjonarne z mentoringiem rówieśniczym. Seniorzy uczą się obsługi smartfona, bankowości internetowej i komunikacji z bliskimi.</p><p>W pilotażu wzięło udział 240 osób w 12 gminach.</p>',
    type: 'innovation',
    format: 'article',
    categorySlug: 'gotowe-innowacje',
    topicSlugs: ['seniorzy', 'wykluczenie-cyfrowe'],
    tags: ['Seniorzy', 'Wykluczenie cyfrowe'],
    cover: IMG('cyfrowi-seniorzy'),
    file: FILE('cyfrowi-seniorzy-blizej-swiata.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 734003,
    author: 'Fundacja Nowe Horyzonty',
    region: 'Małopolska',
    isFeatured: true,
    publishedAt: '2024-03-01T00:00:00.000Z',
    gallery: [IMG('cyfrowi-seniorzy-1'), IMG('cyfrowi-seniorzy-2')],
  },
  {
    slug: 'mapa-wyzwan-spolecznych-malopolski',
    title: 'Mapa wyzwań społecznych Małopolski',
    excerpt: 'Kompleksowa analiza najważniejszych wyzwań społecznych w regionie.',
    type: 'report',
    format: 'pdf',
    categorySlug: 'raporty-i-publikacje',
    topicSlugs: ['wykluczenie-cyfrowe', 'seniorzy'],
    tags: ['Wykluczenie cyfrowe', 'Diagnoza'],
    cover: IMG('mapa-wyzwan'),
    file: FILE('mapa-wyzwan-spolecznych-malopolski.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 1258291,
    pages: 48,
    author: 'Obserwatorium Polityki Społecznej',
    region: 'Małopolska',
    isFeatured: true,
    publishedAt: '2024-03-01T00:00:00.000Z',
  },
  {
    slug: 'zdrowie-psychiczne-mlodziezy-raport',
    title: 'Zdrowie psychiczne młodzieży 2024',
    excerpt: 'Raport z badań dotyczących kondycji psychicznej młodzieży szkolnej.',
    type: 'report',
    format: 'pdf',
    categorySlug: 'raporty-i-publikacje',
    topicSlugs: ['zdrowie-psychiczne', 'mlodziez'],
    tags: ['Zdrowie psychiczne', 'Młodzież'],
    cover: IMG('zdrowie-psychiczne'),
    file: FILE('zdrowie-psychiczne-mlodziezy-2024.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 2097152,
    pages: 72,
    author: 'Instytut Badań Społecznych',
    region: 'Polska',
    publishedAt: '2024-02-15T00:00:00.000Z',
  },
  {
    slug: 'wolontariat-seniorow-publikacja',
    title: 'Wolontariat seniorów — przewodnik wdrożeniowy',
    excerpt: 'Publikacja o tym, jak budować programy wolontariatu z udziałem seniorów.',
    type: 'publication',
    format: 'pdf',
    categorySlug: 'raporty-i-publikacje',
    topicSlugs: ['seniorzy', 'wolontariat'],
    tags: ['Wolontariat'],
    cover: IMG('wolontariat-seniorow'),
    file: FILE('wolontariat-seniorow.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 987654,
    pages: 32,
    author: 'Centrum Aktywności Lokalnej',
    publishedAt: '2024-01-20T00:00:00.000Z',
  },
  {
    slug: 'poradnik-dostepnosc-cyfrowa',
    title: 'Poradnik: dostępność cyfrowa dla NGO',
    excerpt: 'Jak krok po kroku zadbać o dostępność strony i dokumentów.',
    body: '<p>Poradnik prowadzi przez audyt WCAG, poprawę kontrastów, teksty alternatywne i dostępne dokumenty PDF.</p>',
    type: 'guide',
    format: 'pdf',
    categorySlug: 'ucz-sie-i-dzialaj',
    topicSlugs: ['niepelnosprawnosc', 'wykluczenie-cyfrowe'],
    tags: ['Dostępność', 'NGO'],
    cover: IMG('dostepnosc-cyfrowa'),
    file: FILE('poradnik-dostepnosc-cyfrowa-ngo.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 534000,
    pages: 26,
    author: 'Fundacja Dostępność Plus',
    publishedAt: '2024-02-05T00:00:00.000Z',
  },
  {
    slug: 'webinar-wsparcie-seniorow-online',
    title: 'Webinar: wsparcie seniorów online',
    excerpt: 'Nagranie szkolenia o prowadzeniu zdalnych zajęć z seniorami.',
    type: 'webinar',
    format: 'video',
    categorySlug: 'webinary',
    topicSlugs: ['seniorzy', 'wykluczenie-cyfrowe'],
    tags: ['Webinar', 'Seniorzy'],
    cover: IMG('webinar-seniorzy'),
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    durationSeconds: 3720,
    author: 'Akademia NGO',
    publishedAt: '2024-02-28T00:00:00.000Z',
  },
  {
    slug: 'webinar-zdrowie-psychiczne-w-praktyce',
    title: 'Webinar: zdrowie psychiczne w praktyce organizacji',
    excerpt: 'Jak zadbać o dobrostan zespołu i wolontariuszy.',
    type: 'webinar',
    format: 'video',
    categorySlug: 'webinary',
    topicSlugs: ['zdrowie-psychiczne'],
    tags: ['Webinar', 'Wellbeing'],
    cover: IMG('webinar-wellbeing'),
    videoUrl: 'https://vimeo.com/76979871',
    durationSeconds: 2700,
    author: 'Akademia NGO',
    publishedAt: '2024-02-10T00:00:00.000Z',
  },
  {
    slug: 'checklist-organizacja-wydarzenia-dostepnego',
    title: 'Lista kontrolna: dostępne wydarzenie',
    excerpt: 'Praktyczna lista kontrolna przed organizacją wydarzenia.',
    body: '<p>Sprawdź: dostępność miejsca, pętla indukcyjna, tłumacz PJM, materiały w wersji łatwej do czytania.</p>',
    type: 'checklist',
    format: 'article',
    categorySlug: 'ucz-sie-i-dzialaj',
    topicSlugs: ['niepelnosprawnosc'],
    tags: ['Dostępność', 'Wydarzenia'],
    cover: IMG('checklist-wydarzenie'),
    file: FILE('checklist-dostepne-wydarzenie.pdf'),
    fileType: 'pdf',
    fileSizeBytes: 320000,
    author: 'Fundacja Dostępność Plus',
    publishedAt: '2024-03-05T00:00:00.000Z',
  },
  {
    slug: 'challenge-map-bezdomnosc',
    title: 'Mapa wyzwań: bezdomność w miastach',
    excerpt: 'Diagnoza lokalnych wyzwań związanych z bezdomnością.',
    type: 'challenge_map',
    format: 'map',
    categorySlug: 'mapy-wyzwan',
    topicSlugs: ['wolontariat'],
    tags: ['Bezdomność', 'Diagnoza'],
    cover: IMG('mapa-bezdomnosc'),
    author: 'Obserwatorium Miejskie',
    region: 'Kraków',
    publishedAt: '2024-01-10T00:00:00.000Z',
  },
  {
    slug: 'case-study-mentoring-mlodziezy',
    title: 'Studium przypadku: mentoring młodzieży',
    excerpt: 'Historia programu mentoringowego dla młodzieży z małych miejscowości.',
    body: '<p>Program łączył uczniów z mentorami-liderami lokalnymi. Po roku 78% uczestników deklarowało wyższą motywację do nauki.</p>',
    type: 'case_study',
    format: 'article',
    categorySlug: 'dobra-praktyka',
    topicSlugs: ['mlodziez', 'wolontariat'],
    tags: ['Mentoring', 'Młodzież'],
    cover: IMG('case-mentoring'),
    author: 'Fundacja Dobra Energia',
    region: 'Małopolska',
    publishedAt: '2024-02-20T00:00:00.000Z',
    gallery: [IMG('case-mentoring-1')],
  },
  {
    slug: 'video-seniorzy-w-ruchu',
    title: 'Wideo: seniorzy w ruchu',
    excerpt: 'Krótki film o programie aktywności fizycznej dla seniorów.',
    type: 'video',
    format: 'video',
    categorySlug: 'gotowe-innowacje',
    topicSlugs: ['seniorzy'],
    tags: ['Sport', 'Seniorzy'],
    cover: IMG('seniorzy-w-ruchu'),
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    durationSeconds: 420,
    author: 'Fundacja Aktywni',
    publishedAt: '2024-03-08T00:00:00.000Z',
  },
  {
    slug: 'innowacja-telefon-zaufania-seniora',
    title: 'Telefon zaufania dla seniorów',
    excerpt: 'Innowacja społeczna: infolinia wsparcia dla osób starszych.',
    type: 'innovation',
    format: 'article',
    categorySlug: 'gotowe-innowacje',
    topicSlugs: ['seniorzy', 'zdrowie-psychiczne'],
    tags: ['Wsparcie', 'Seniorzy'],
    cover: IMG('telefon-zaufania'),
    author: 'Caritas Małopolska',
    region: 'Małopolska',
    isFeatured: true,
    publishedAt: '2024-03-12T00:00:00.000Z',
  },
  {
    slug: 'draft-material-hidden',
    title: 'Materiał w przygotowaniu',
    excerpt: 'Ten materiał nie jest opublikowany i nie powinien pojawić się publicznie.',
    type: 'innovation',
    format: 'article',
    status: 'draft',
    categorySlug: 'gotowe-innowacje',
    topicSlugs: ['seniorzy'],
    tags: ['Draft'],
    cover: IMG('draft'),
    author: 'Redakcja',
    publishedAt: undefined,
  },
];

async function main(): Promise<void> {
  process.stdout.write('[seed] resetting content tables...\n');
  await db.execute(sql`truncate table ${materialTags}, ${materialTopics}, ${searchTerms} restart identity`);
  await db.execute(sql`truncate table ${materials} cascade`);
  await db.execute(sql`truncate table ${topics} cascade`);
  await db.execute(sql`truncate table ${categories} cascade`);

  process.stdout.write('[seed] inserting categories and topics...\n');
  const categoryRows = await db.insert(categories).values(SEED_CATEGORIES).returning();
  const topicRows = await db.insert(topics).values(SEED_TOPICS).returning();

  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));
  const topicBySlug = new Map(topicRows.map((t) => [t.slug, t.id]));

  const allMaterials: SeedMaterial[] = [...SEED_MATERIALS, ...SEED_MATERIALS_EXTRA];
  process.stdout.write(`[seed] inserting ${allMaterials.length} materials...\n`);
  for (const item of allMaterials) {
    const [material] = await db
      .insert(materials)
      .values({
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        body: item.body ?? null,
        type: item.type,
        format: item.format,
        status: item.status ?? 'published',
        categoryId: item.categorySlug ? categoryBySlug.get(item.categorySlug) ?? null : null,
        coverUrl: item.cover,
        thumbnailUrl: THUMB(item.slug),
        fileUrl: item.file ?? null,
        fileType: item.fileType ?? null,
        fileSizeBytes: item.fileSizeBytes ?? null,
        pages: item.pages ?? null,
        videoUrl: item.videoUrl ?? null,
        durationSeconds: item.durationSeconds ?? null,
        author: item.author,
        region: item.region ?? null,
        isFeatured: item.isFeatured ?? false,
        gallery: item.gallery ?? null,
        publishedAt: item.status === 'draft' ? null : new Date(item.publishedAt ?? Date.now()),
      })
      .returning();

    if (item.topicSlugs.length > 0) {
      const rows = item.topicSlugs
        .map((slug) => topicBySlug.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((topicId) => ({ materialId: material.id, topicId }));
      if (rows.length > 0) {
        await db.insert(materialTopics).values(rows);
      }
    }

    if (item.tags.length > 0) {
      await db.insert(materialTags).values(item.tags.map((tag) => ({ materialId: material.id, tag })));
    }
  }

  process.stdout.write('[seed] seeding popular searches...\n');
  await db.insert(searchTerms).values([
    { term: 'innowacje dla seniorów', searches: 120 },
    { term: 'zdrowie psychiczne młodzieży', searches: 86 },
    { term: 'dostępność cyfrowa', searches: 64 },
    { term: 'wolontariat', searches: 41 },
    { term: 'raport małopolska', searches: 27 },
  ]);

  process.stdout.write('[seed] done.\n');
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`[seed] failed: ${String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => {
    void closeDatabase();
  });
