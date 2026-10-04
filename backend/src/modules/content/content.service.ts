import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../../db/client.js';
import {
  categories,
  contactMessages,
  materialTags,
  materialTopics,
  materials,
  searchTerms,
  topics,
  type Category,
  type ContactMessage,
  type Material,
  type Topic,
} from '../../db/schema.js';
import { HttpError } from '../../utils/http-error.js';
import { sendMail } from '../../mail/mailer.js';
import { paginationMeta, type PaginationMeta } from './content.query.js';
import { typeLabel, type ContactInput } from './content.schemas.js';

// ---------- DTOs ----------

export interface CategoryDTO {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  accent: string;
  materialCount: number;
  sortOrder: number;
}

export interface TopicDTO {
  id: string;
  slug: string;
  name: string;
  icon: string;
  materialCount: number;
}

export interface CategoryRef {
  id: string;
  slug: string;
  name: string;
}

export interface TopicRef {
  id: string;
  slug: string;
  name: string;
}

export interface AttachmentDTO {
  name: string;
  url: string;
  type: string;
  sizeBytes: number | null;
}

export interface MaterialSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  type: string;
  typeLabel: string;
  format: string;
  publishedAt: string | null;
  updatedAt: string;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  category: CategoryRef | null;
  topics: TopicRef[];
  author: string | null;
  region: string | null;
  language: string;
  isFeatured: boolean;
  fileUrl: string | null;
  fileType: string | null;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  videoUrl?: string | null;
  pages?: number | null;
  badge?: string;
}

export interface MaterialDetail extends MaterialSummary {
  body: string | null;
  gallery: string[];
  attachments: AttachmentDTO[];
  related: MaterialSummary[];
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------- Helpers ----------

const PUBLISHED: SQL = and(eq(materials.status, 'published'), isNotNull(materials.publishedAt))!;

function toRefCategory(category: Category | null): CategoryRef | null {
  return category ? { id: category.id, slug: category.slug, name: category.name } : null;
}

function toRefTopic(topic: Topic): TopicRef {
  return { id: topic.id, slug: topic.slug, name: topic.name };
}

interface MaterialRow {
  material: Material;
  category: Category | null;
}

async function topicsForMaterials(ids: string[]): Promise<Map<string, TopicRef[]>> {
  const map = new Map<string, TopicRef[]>();
  if (ids.length === 0) {
    return map;
  }
  const rows = await db
    .select({ materialId: materialTopics.materialId, topic: topics })
    .from(materialTopics)
    .innerJoin(topics, eq(topics.id, materialTopics.topicId))
    .where(inArray(materialTopics.materialId, ids));

  for (const row of rows) {
    const list = map.get(row.materialId) ?? [];
    list.push(toRefTopic(row.topic));
    map.set(row.materialId, list);
  }
  return map;
}

async function tagsForMaterials(ids: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (ids.length === 0) {
    return map;
  }
  const rows = await db
    .select({ materialId: materialTags.materialId, tag: materialTags.tag })
    .from(materialTags)
    .where(inArray(materialTags.materialId, ids));

  for (const row of rows) {
    const list = map.get(row.materialId) ?? [];
    list.push(row.tag);
    map.set(row.materialId, list);
  }
  return map;
}

function toSummary(
  row: MaterialRow,
  topicList: TopicRef[],
  tagList: string[],
  extra?: Partial<MaterialSummary>,
): MaterialSummary {
  const m = row.material;
  return {
    id: m.id,
    slug: m.slug,
    title: m.title,
    excerpt: m.excerpt,
    type: m.type,
    typeLabel: typeLabel(m.type),
    format: m.format,
    publishedAt: m.publishedAt ? m.publishedAt.toISOString() : null,
    updatedAt: m.updatedAt.toISOString(),
    coverUrl: m.coverUrl,
    thumbnailUrl: m.thumbnailUrl,
    tags: tagList,
    category: toRefCategory(row.category),
    topics: topicList,
    author: m.author,
    region: m.region,
    language: m.language,
    isFeatured: m.isFeatured,
    fileUrl: m.fileUrl,
    fileType: m.fileType,
    fileSizeBytes: m.fileSizeBytes,
    durationSeconds: m.durationSeconds,
    pages: m.pages,
    videoUrl: m.videoUrl,
    ...extra,
  };
}

async function hydrate(rows: MaterialRow[]): Promise<MaterialSummary[]> {
  const ids = rows.map((row) => row.material.id);
  const [topicMap, tagMap] = await Promise.all([topicsForMaterials(ids), tagsForMaterials(ids)]);
  return rows.map((row) => toSummary(row, topicMap.get(row.material.id) ?? [], tagMap.get(row.material.id) ?? []));
}

interface MaterialFilters {
  types?: string[];
  categorySlugOrId?: string;
  topicSlugs?: string[];
  featured?: boolean;
  search?: string;
  learningOnly?: boolean;
  reportYear?: number;
}

async function buildConditions(filters: MaterialFilters): Promise<SQL[]> {
  const conditions: SQL[] = [PUBLISHED];

  if (filters.types && filters.types.length > 0) {
    conditions.push(inArray(materials.type, filters.types));
  }

  if (filters.categorySlugOrId) {
    const categoryId = await resolveCategoryId(filters.categorySlugOrId);
    if (!categoryId) {
      conditions.push(sql`false`);
    } else {
      conditions.push(eq(materials.categoryId, categoryId));
    }
  }

  if (filters.topicSlugs && filters.topicSlugs.length > 0) {
    const topicIds = await resolveTopicIds(filters.topicSlugs);
    if (topicIds.length === 0) {
      conditions.push(sql`false`);
    } else {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(materialTopics)
            .where(
              and(
                eq(materialTopics.materialId, materials.id),
                inArray(materialTopics.topicId, topicIds),
              ),
            ),
        ),
      );
    }
  }

  if (filters.featured === true) {
    conditions.push(eq(materials.isFeatured, true));
  }

  if (filters.search && filters.search.trim() !== '') {
    const pattern = `%${filters.search.trim()}%`;
    const searchCondition = or(
      ilike(materials.title, pattern),
      ilike(materials.excerpt, pattern),
      ilike(materials.body, pattern),
      sql`exists (select 1 from ${materialTags} where ${materialTags.materialId} = ${materials.id} and ${materialTags.tag} ilike ${pattern})`,
    );
    if (searchCondition !== undefined) {
      conditions.push(searchCondition);
    }
  }

  if (filters.reportYear !== undefined) {
    conditions.push(sql`extract(year from ${materials.publishedAt}) = ${filters.reportYear}`);
  }

  return conditions;
}

function orderBy(sort: string): SQL {
  switch (sort) {
    case 'publishedAt':
      return asc(materials.publishedAt);
    case 'title':
      return asc(materials.title);
    case '-publishedAt':
    default:
      return desc(materials.publishedAt);
  }
}

async function listMaterials(
  filters: MaterialFilters,
  page: number,
  limit: number,
  sort: string,
): Promise<Paginated<MaterialSummary>> {
  const conditions = await buildConditions(filters);
  const where = and(...conditions);
  const offset = (page - 1) * limit;

  const rows = await db
    .select({ material: materials, category: categories })
    .from(materials)
    .leftJoin(categories, eq(categories.id, materials.categoryId))
    .where(where)
    .orderBy(orderBy(sort))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db.select({ total: count(materials.id) }).from(materials).where(where);

  return {
    data: await hydrate(rows),
    meta: paginationMeta(page, limit, Number(total)),
  };
}

async function resolveCategoryId(slugOrId: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(isUuid ? eq(categories.id, slugOrId) : eq(categories.slug, slugOrId))
    .limit(1);
  return row?.id ?? null;
}

async function resolveTopicIds(slugs: string[]): Promise<string[]> {
  const rows = await db
    .select({ id: topics.id })
    .from(topics)
    .where(inArray(topics.slug, slugs));
  return rows.map((row) => row.id);
}

// ---------- Public API ----------

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await db
    .select({ category: categories, materialCount: count(materials.id) })
    .from(categories)
    .leftJoin(
      materials,
      and(eq(materials.categoryId, categories.id), eq(materials.status, 'published'), isNotNull(materials.publishedAt)),
    )
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder), asc(categories.name));

  return rows.map((row) => ({
    id: row.category.id,
    slug: row.category.slug,
    name: row.category.name,
    description: row.category.description,
    icon: row.category.icon,
    accent: row.category.accent,
    materialCount: Number(row.materialCount),
    sortOrder: row.category.sortOrder,
  }));
}

export async function listTopics(): Promise<TopicDTO[]> {
  const rows = await db
    .select({ topic: topics, materialCount: count(materials.id) })
    .from(topics)
    .leftJoin(materialTopics, eq(materialTopics.topicId, topics.id))
    .leftJoin(
      materials,
      and(
        eq(materials.id, materialTopics.materialId),
        eq(materials.status, 'published'),
        isNotNull(materials.publishedAt),
      ),
    )
    .groupBy(topics.id)
    .orderBy(desc(count(materials.id)), asc(topics.name));

  return rows.map((row) => ({
    id: row.topic.id,
    slug: row.topic.slug,
    name: row.topic.name,
    icon: row.topic.icon,
    materialCount: Number(row.materialCount),
  }));
}

export async function listMaterialsQuery(params: {
  types: string[];
  category?: string;
  topics: string[];
  featured?: boolean;
  search?: string;
  sort: string;
  page: number;
  limit: number;
}): Promise<Paginated<MaterialSummary>> {
  return listMaterials(
    {
      types: params.types,
      categorySlugOrId: params.category,
      topicSlugs: params.topics,
      featured: params.featured,
      search: params.search,
    },
    params.page,
    params.limit,
    params.sort,
  );
}

export async function listFeatured(params: {
  limit: number;
  topics: string[];
  category?: string;
}): Promise<MaterialSummary[]> {
  const result = await listMaterials(
    { featured: true, topicSlugs: params.topics, categorySlugOrId: params.category },
    1,
    params.limit,
    '-publishedAt',
  );
  return result.data.map((item) => ({
    ...item,
    badge: item.typeLabel,
  }));
}

export async function listReports(params: {
  type: string;
  year?: number;
  topics: string[];
  category?: string;
  sort: string;
  page: number;
  limit: number;
}): Promise<Paginated<MaterialSummary>> {
  const result = await listMaterials(
    {
      types: [params.type],
      topicSlugs: params.topics,
      categorySlugOrId: params.category,
      reportYear: params.year,
    },
    params.page,
    params.limit,
    params.sort,
  );
  return {
    data: result.data.map((item) => ({ ...item, badge: item.typeLabel })),
    meta: result.meta,
  };
}

export async function listLearning(params: {
  type?: string;
  topics: string[];
  category?: string;
  sort: string;
  page: number;
  limit: number;
}): Promise<Paginated<MaterialSummary>> {
  const result = await listMaterials(
    {
      types: params.type ? [params.type] : ['guide', 'webinar', 'checklist'],
      topicSlugs: params.topics,
      categorySlugOrId: params.category,
    },
    params.page,
    params.limit,
    params.sort,
  );
  return {
    data: result.data.map((item) => ({ ...item, badge: item.typeLabel })),
    meta: result.meta,
  };
}

export interface Facet {
  slug: string;
  name: string;
  count: number;
}

export interface SearchResult extends Paginated<MaterialSummary> {
  facets: {
    categories: Facet[];
    topics: Facet[];
    types: Facet[];
  };
}

export async function search(params: {
  q: string;
  types: string[];
  category?: string;
  topics: string[];
  page: number;
  limit: number;
}): Promise<SearchResult> {
  const filters: MaterialFilters = {
    types: params.types,
    categorySlugOrId: params.category,
    topicSlugs: params.topics,
    search: params.q,
  };
  const result = await listMaterials(filters, params.page, params.limit, '-publishedAt');

  if (params.q.trim() !== '') {
    await recordSearch(params.q);
  }

  const conditions = await buildConditions(filters);
  const where = and(...conditions);

  const categoryFacets = await db
    .select({ slug: categories.slug, name: categories.name, count: count(materials.id) })
    .from(materials)
    .innerJoin(categories, eq(categories.id, materials.categoryId))
    .where(where)
    .groupBy(categories.slug, categories.name)
    .orderBy(desc(count(materials.id)));

  const typeFacets = await db
    .select({ type: materials.type, count: count(materials.id) })
    .from(materials)
    .where(where)
    .groupBy(materials.type)
    .orderBy(desc(count(materials.id)));

  const topicFacets = await db
    .select({ slug: topics.slug, name: topics.name, count: count(materialTopics.materialId) })
    .from(materialTopics)
    .innerJoin(topics, eq(topics.id, materialTopics.topicId))
    .innerJoin(materials, eq(materials.id, materialTopics.materialId))
    .where(where)
    .groupBy(topics.slug, topics.name)
    .orderBy(desc(count(materialTopics.materialId)));

  return {
    ...result,
    facets: {
      categories: categoryFacets.map((f) => ({ slug: f.slug, name: f.name, count: Number(f.count) })),
      topics: topicFacets.map((f) => ({ slug: f.slug, name: f.name, count: Number(f.count) })),
      types: typeFacets.map((f) => ({ slug: f.type, name: typeLabel(f.type), count: Number(f.count) })),
    },
  };
}

async function recordSearch(term: string): Promise<void> {
  const normalized = term.trim().toLowerCase().slice(0, 200);
  if (!normalized) {
    return;
  }
  await db
    .insert(searchTerms)
    .values({ term: normalized, searches: 1 })
    .onConflictDoUpdate({
      target: searchTerms.term,
      set: { searches: sql`${searchTerms.searches} + 1`, updatedAt: new Date() },
    });
}

export async function listPopularSearches(limit: number): Promise<{ term: string; searches: number }[]> {
  const rows = await db
    .select({ term: searchTerms.term, searches: searchTerms.searches })
    .from(searchTerms)
    .orderBy(desc(searchTerms.searches))
    .limit(limit);
  return rows.map((row) => ({ term: row.term, searches: Number(row.searches) }));
}

export async function getMaterialBySlug(slug: string): Promise<MaterialDetail> {
  const [row] = await db
    .select({ material: materials, category: categories })
    .from(materials)
    .leftJoin(categories, eq(categories.id, materials.categoryId))
    .where(and(eq(materials.slug, slug), eq(materials.status, 'published')))
    .limit(1);

  if (!row) {
    throw HttpError.notFound('Material not found');
  }

  const [topicMap, tagMap] = await Promise.all([
    topicsForMaterials([row.material.id]),
    tagsForMaterials([row.material.id]),
  ]);
  const summary = toSummary(row, topicMap.get(row.material.id) ?? [], tagMap.get(row.material.id) ?? []);

  const gallery = Array.isArray(row.material.gallery) ? (row.material.gallery as string[]) : [];

  const attachments: AttachmentDTO[] = row.material.fileUrl
    ? [
        {
          name: filenameFromUrl(row.material.fileUrl),
          url: row.material.fileUrl,
          type: row.material.fileType ?? 'file',
          sizeBytes: row.material.fileSizeBytes,
        },
      ]
    : [];

  const related = await relatedMaterials(row.material, topicMap.get(row.material.id) ?? []);

  return {
    ...summary,
    body: row.material.body,
    gallery,
    attachments,
    related,
  };
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').filter(Boolean).pop();
    return name ?? 'download';
  } catch {
    return 'download';
  }
}

async function relatedMaterials(material: Material, materialTopicRefs: TopicRef[]): Promise<MaterialSummary[]> {
  const topicIds = materialTopicRefs.map((t) => t.id);

  let rows: MaterialRow[] = [];
  if (topicIds.length > 0) {
    rows = await db
      .select({ material: materials, category: categories })
      .from(materials)
      .innerJoin(materialTopics, eq(materialTopics.materialId, materials.id))
      .leftJoin(categories, eq(categories.id, materials.categoryId))
      .where(
        and(
          PUBLISHED,
          inArray(materialTopics.topicId, topicIds),
          sql`${materials.id} <> ${material.id}`,
        ),
      )
      .orderBy(desc(materials.publishedAt))
      .limit(4);
  }

  if (rows.length < 4 && material.categoryId) {
    const excludeIds = [material.id, ...rows.map((r) => r.material.id)];
    const more = await db
      .select({ material: materials, category: categories })
      .from(materials)
      .leftJoin(categories, eq(categories.id, materials.categoryId))
      .where(
        and(PUBLISHED, eq(materials.categoryId, material.categoryId), sql`${materials.id} not in ${excludeIds}`),
      )
      .orderBy(desc(materials.publishedAt))
      .limit(4 - rows.length);
    rows = [...rows, ...more];
  }

  const unique = new Map<string, MaterialRow>();
  for (const row of rows) {
    unique.set(row.material.id, row);
  }
  return hydrate([...unique.values()].slice(0, 4));
}

export async function getMaterialForDownload(
  id: string,
): Promise<{ fileUrl: string | null; fileType: string | null; title: string }> {
  const [row] = await db
    .select({ fileUrl: materials.fileUrl, fileType: materials.fileType, title: materials.title })
    .from(materials)
    .where(and(eq(materials.id, id), eq(materials.status, 'published')))
    .limit(1);

  if (!row) {
    throw HttpError.notFound('Material not found');
  }
  return row;
}

export interface HomeAggregate {
  categories: CategoryDTO[];
  topics: TopicDTO[];
  featured: MaterialSummary[];
  reports: MaterialSummary[];
  learning: MaterialSummary[];
  mostSearched: { term: string; searches: number }[];
}

export async function getHome(): Promise<HomeAggregate> {
  const [categoriesList, topicsList, featured, reports, learning, mostSearched] = await Promise.all([
    listCategories(),
    listTopics(),
    listFeatured({ limit: 4, topics: [] }),
    listReports({ type: 'report', topics: [], sort: '-publishedAt', page: 1, limit: 4 }),
    listLearning({ topics: [], sort: '-publishedAt', page: 1, limit: 4 }),
    listPopularSearches(5),
  ]);

  return {
    categories: categoriesList,
    topics: topicsList,
    featured,
    reports: reports.data,
    learning: learning.data,
    mostSearched,
  };
}

export async function submitContact(input: ContactInput): Promise<void> {
  await db.insert(contactMessages).values({
    name: input.name,
    email: input.email,
    subject: input.subject ?? null,
    message: input.message,
  });

  await sendMail({
    to: input.email,
    subject: 'We received your message',
    text: `Hi ${input.name},\n\nThanks for contacting us. We received your message and will get back to you soon.\n\nYour message:\n${input.message}`,
  });
}

export type { ContactMessage };
