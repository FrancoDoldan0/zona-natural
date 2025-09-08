// app/api/public/producto/[slug]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';


const prisma = createPrisma();
// Next 15: no tipar el 2º argumento; usar destructuring con `any`
export async function GET(_req: Request, { params }: any) {
  const slug = String(params?.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  const p = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        select: { url: true, alt: true, sortOrder: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      productTags: { select: { tagId: true } },
    },
  });

  if (!p) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Precios y oferta (mismo helper que catálogo)
  const bare = [
    {
      id: p.id,
      price: p.price,
      categoryId: p.categoryId,
      tags: (p.productTags || []).map((t) => t.tagId),
    },
  ];
  const priced = await computePricesBatch(bare);
  const pr = priced.get(p.id);

  const hasDiscount =
    pr?.priceOriginal != null && pr?.priceFinal != null && pr.priceFinal < pr.priceOriginal;

  const item = {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    sku: p.sku,
    coverUrl: p.images?.[0]?.url ?? null,
    images: p.images ?? [],
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
      : null,

    // datos enriquecidos para la UI
    priceOriginal: pr?.priceOriginal ?? (typeof p.price === 'number' ? p.price : null),
    priceFinal: pr?.priceFinal ?? (typeof p.price === 'number' ? p.price : null),
    offer: pr?.offer ?? null,
    hasDiscount,
    discountPercent:
      hasDiscount && pr?.priceOriginal && pr?.priceFinal
        ? Math.round((1 - pr.priceFinal! / pr.priceOriginal!) * 100)
        : 0,
  };

  return NextResponse.json({ ok: true, item });
}
