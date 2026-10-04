import { createHash } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import type {
  FeaturedQuery,
  LearningQuery,
  MaterialsQuery,
  ReportsQuery,
  SearchQuery,
  PopularQuery,
  ContactInput,
} from './content.schemas.js';
import * as service from './content.service.js';

/**
 * Adds a weak ETag and Cache-Control to public list responses, and answers 304
 * when the client already has the current version.
 */
function withCache(res: Response, body: unknown, maxAgeSeconds = 60): void {
  const etag = `W/"${createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=300`);
  if (res.req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.json(body);
}

function query<T>(res: Response): T {
  return res.locals.query as T;
}

export const listCategories: RequestHandler = async (_req, res) => {
  withCache(res, { data: await service.listCategories() }, 300);
};

export const listTopics: RequestHandler = async (_req, res) => {
  withCache(res, { data: await service.listTopics() }, 300);
};

export const listMaterials: RequestHandler = async (_req, res) => {
  const q = query<MaterialsQuery>(res);
  const result = await service.listMaterialsQuery({
    types: q.type,
    category: q.category,
    topics: q.topic,
    featured: q.featured,
    search: q.search,
    sort: q.sort,
    page: q.page,
    limit: q.limit,
  });
  withCache(res, result, 60);
};

export const listFeatured: RequestHandler = async (_req, res) => {
  const q = query<FeaturedQuery>(res);
  const data = await service.listFeatured({ limit: q.limit, topics: q.topic, category: q.category });
  withCache(res, { data }, 120);
};

export const listReports: RequestHandler = async (_req, res) => {
  const q = query<ReportsQuery>(res);
  const result = await service.listReports({
    type: q.type,
    year: q.year,
    topics: q.topic,
    category: q.category,
    sort: q.sort,
    page: q.page,
    limit: q.limit,
  });
  withCache(res, result, 300);
};

export const listLearning: RequestHandler = async (_req, res) => {
  const q = query<LearningQuery>(res);
  const result = await service.listLearning({
    type: q.type,
    topics: q.topic,
    category: q.category,
    sort: q.sort,
    page: q.page,
    limit: q.limit,
  });
  withCache(res, result, 120);
};

export const search: RequestHandler = async (_req, res) => {
  const q = query<SearchQuery>(res);
  const result = await service.search({
    q: q.q,
    types: q.type,
    category: q.category,
    topics: q.topic,
    page: q.page,
    limit: q.limit,
  });
  withCache(res, result, 30);
};

export const popularSearches: RequestHandler = async (_req, res) => {
  const q = query<PopularQuery>(res);
  const data = await service.listPopularSearches(q.limit);
  withCache(res, { data }, 60);
};

export const home: RequestHandler = async (_req, res) => {
  withCache(res, await service.getHome(), 60);
};

export const getMaterial: RequestHandler = async (req, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const material = await service.getMaterialBySlug(slug);
  withCache(res, material, 120);
};

export const downloadMaterial: RequestHandler = async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const material = await service.getMaterialForDownload(id);

  if (!material.fileUrl) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'This material has no downloadable file' },
    });
    return;
  }

  const filename = filenameFor(material.fileUrl, material.title, material.fileType);
  res.setHeader('Content-Disposition', contentDisposition(filename));
  res.redirect(302, material.fileUrl);
};

/**
 * Prefer the filename from the file URL when it is ASCII-safe and has an extension;
 * otherwise fall back to a transliterated version of the title.
 */
function filenameFor(fileUrl: string, title: string, fileType: string | null): string {
  const fromUrl = basenameFromUrl(fileUrl);
  if (fromUrl && /^[\x20-\x7e]+$/.test(fromUrl)) {
    return fromUrl;
  }

  const base =
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ł/g, 'l')
      .replace(/Ł/g, 'L')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'download';
  return fileType ? `${base}.${fileType}` : base;
}

function basenameFromUrl(url: string): string | null {
  try {
    const name = new URL(url).pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : null;
  } catch {
    return null;
  }
}

/**
 * Builds an RFC 6266 / RFC 5987 compliant Content-Disposition value that survives
 * non-ASCII filenames: an ASCII `filename` fallback plus a UTF-8 `filename*`.
 */
function contentDisposition(filename: string): string {
  const asciiFallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export const submitContact: RequestHandler = async (req, res) => {
  const input = req.body as ContactInput;
  await service.submitContact(input);
  res.status(202).json({
    message: 'Thank you. We received your message and will get back to you soon.',
  });
};
