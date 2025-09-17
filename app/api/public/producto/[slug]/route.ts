// app/api/public/producto/[slug]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

// Next 15: no tipar el 2º argumento; usar destructuring con `any`
export async function GET(_req: Request, { params }: any) {
  const slug = String(params?.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  // ✅ Solo productos visibles públicamente: ACTIVE o AGOTADO
  //  (usamos findFirst para poder combinar slug + status)
  const p = await prisma.product.findFirst({
    where: {
      slug,
      status: { in: ['ACTIVE', 'AGOTADO'] },
    },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        // En el schema usamos `key` (no `url`)
        select: { id: true, key: true, alt: true, sortOrder: true, isCover: true, size: true },
      },
      category: { select: { id: true, name: true, slug: true } },
      productTags: { select: { tagId: true } },
    },
  });

  if (!p) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  // Mapear imágenes al shape público con `url`
  const images =
    (p.images ?? []).map((img) => ({
      id: img.id,
      url: publicR2Url(img.key),
      alt: img.alt ?? null,
      sortOrder: img.sortOrder ?? 0,
      isCover: !!img.isCover,
      size: img.size ?? null,
    })) ?? [];

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
    status: p.status, // 👈 para poder mostrar “AGOTADO” en la UI
    coverUrl: images[0]?.url ?? null,
    images,
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
