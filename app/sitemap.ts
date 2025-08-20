export const runtime = "nodejs";         // ✅ fuerza Node.js
export const revalidate = 1800;

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/+$/,"");

  const prods = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`,        lastModified: new Date() },
    { url: `${base}/catalogo`, lastModified: new Date() },
  ];

  const productUrls: MetadataRoute.Sitemap = prods.map(p => ({
    url: `${base}/producto/${encodeURIComponent(p.slug)}`,
    lastModified: p.updatedAt ?? new Date(),
  }));

  return [...staticUrls, ...productUrls];
}