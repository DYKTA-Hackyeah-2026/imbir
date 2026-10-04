export type SeedMaterial = {
  slug: string;
  title: string;
  excerpt: string;
  body?: string;
  type: string;
  format: string;
  status?: string;
  categorySlug: string | null;
  topicSlugs: string[];
  tags: string[];
  cover: string;
  file?: string;
  fileType?: string;
  fileSizeBytes?: number;
  pages?: number;
  videoUrl?: string;
  durationSeconds?: number;
  author: string;
  region?: string;
  isFeatured?: boolean;
  publishedAt?: string;
  gallery?: string[];
};

export type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  accent: string;
  sortOrder: number;
};

export type SeedTopic = {
  slug: string;
  name: string;
  icon: string;
};
