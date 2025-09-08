export const runtime = 'edge';

import type { MetadataRoute } from 'next';
import { createPrisma } from '@/lib/prisma-edge';
import { siteUrl } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const prisma = createPrisma();
  const now = new Date();

  const [products, categories, subcats, tags, totalActive] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({ select: { id: true, slug: true, updatedAt: true } }),
    prisma.subcategory.findMany({ select: { id: true, slug: true, updatedAt: true } }),
    prisma.tag.findMany({ select: { id: true, name: true } }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
  ]);

  const perPage = 20;
  const pageCount = Math.max(1, Math.ceil(totalActive / perPage));
  const maxListed = Math.min(pageCount, 20); // evita sitemaps gigantes

  const urls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/productos`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },

    // Paginación de /productos (desde página 2)
    ...Array.from({ length: Math.max(0, maxListed - 1) }, (_, i) => ({
      url: `${siteUrl}/productos?page=${i + 2}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),

    // Listados por categoría / subcategoría (usando query params)
    ...categories.map((c) => ({
      url: `${siteUrl}/productos?categoryId=${c.id}`,
      lastModified: c.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...subcats.map((s) => ({
      url: `${siteUrl}/productos?subcategoryId=${s.id}`,
      lastModified: s.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),

    // Listados por tags (query params)
    ...tags.map((t) => ({
      url: `${siteUrl}/productos?tagId=${t.id}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),

    // Fichas de producto
    ...products.map((p) => ({
      url: `${siteUrl}/producto/${p.slug}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];

  return urls;
}
