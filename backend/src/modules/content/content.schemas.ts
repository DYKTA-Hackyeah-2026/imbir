import { z } from 'zod';
import { MAX_LIMIT } from './content.query.js';

export const MATERIAL_TYPES = [
  'innovation',
  'report',
  'publication',
  'guide',
  'webinar',
  'checklist',
  'video',
  'challenge_map',
  'case_study',
] as const;

export const MATERIAL_FORMATS = ['article', 'pdf', 'video', 'map'] as const;

export const LEARNING_TYPES = ['guide', 'webinar', 'checklist'] as const;
export const REPORT_TYPES = ['report', 'publication'] as const;

export const TYPE_LABELS: Record<string, string> = {
  innovation: 'Innowacja',
  report: 'Raport',
  publication: 'Publikacja',
  guide: 'Poradnik',
  webinar: 'Webinar',
  checklist: 'Lista kontrolna',
  video: 'Wideo',
  challenge_map: 'Mapa wyzwań',
  case_study: 'Studium przypadku',
};

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

const csvString = z
  .string()
  .optional()
  .transform((value) =>
    typeof value === 'string' && value.trim() !== ''
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [],
  );

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
};

export const materialsQuerySchema = z.object({
  type: csvString,
  category: z.string().trim().min(1).optional(),
  topic: csvString,
  featured: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  search: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(['publishedAt', '-publishedAt', 'title']).default('-publishedAt'),
  ...pagination,
});

export const featuredQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(4),
  topic: csvString,
  category: z.string().trim().min(1).optional(),
});

export const reportsQuerySchema = z.object({
  type: z.enum(REPORT_TYPES).default('report'),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
  topic: csvString,
  category: z.string().trim().min(1).optional(),
  sort: z.enum(['publishedAt', '-publishedAt', 'title']).default('-publishedAt'),
  ...pagination,
});

export const learningQuerySchema = z.object({
  type: z.enum(LEARNING_TYPES).optional(),
  topic: csvString,
  category: z.string().trim().min(1).optional(),
  sort: z.enum(['publishedAt', '-publishedAt', 'title']).default('-publishedAt'),
  ...pagination,
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
  type: csvString,
  category: z.string().trim().min(1).optional(),
  topic: csvString,
  ...pagination,
});

export const popularQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email().max(320),
  subject: z.string().trim().max(300).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(5000),
});

export type MaterialsQuery = z.infer<typeof materialsQuerySchema>;
export type FeaturedQuery = z.infer<typeof featuredQuerySchema>;
export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
export type LearningQuery = z.infer<typeof learningQuerySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type PopularQuery = z.infer<typeof popularQuerySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
