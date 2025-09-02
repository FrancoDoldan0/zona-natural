import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
  });

  const now = new Date();

  const urls: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`,         lastModified: now, changeFrequency: "daily",  priority: 1 },
    { url: `${siteUrl}/productos`,lastModified: now, changeFrequency: "daily",  priority: 0.8 },
    ...products.map((p) => ({
      url: `${siteUrl}/producto/${p.slug}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return urls;
}