// app/api/public/producto/[slug]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

// Next 15: no tipar el 2º argumento; usamos `any` para evitar incompatibilidades
export async function GET(req: Request, { params }: any) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  try {
    const slug = String(params?.slug ?? '').trim();
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'missing_slug' }, { status: 400 });
    }

    // Solo productos visibles públicamente: ACTIVE o AGOTADO
    // findFirst para combinar slug + status
    const p: any = await prisma.product.findFirst({
      where: {
        slug,
        status: { in: ['ACTIVE', 'AGOTADO'] },
      },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
          // ⚠ Seleccionamos solo columnas que existen seguro en tu DB actual
          select: { id: true, key: true },
        },
        category: { select: { id: true, name: true, slug: true } },
        productTags: { select: { tagId: true } },
      },
    });

    if (!p) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    // Mapear imágenes al shape público con `url`
    const images =
      (p.images ?? []).map((img: any) => ({
        id: img.id,
        url: publicR2Url(img.key),
        alt: null,            // campos opcionales no presentes en tu DB actual
        sortOrder: 0,
        isCover: false,
        size: null,
      })) ?? [];

    // Precios y oferta (mismo helper que catálogo)
    const bare = [
      {
        id: p.id,
        price: p.price,
        categoryId: p.categoryId,
        tags: (p.productTags || []).map((t: any) => t.tagId),
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
      status: p.status as string, // para poder mostrar “AGOTADO” en la UI
      coverUrl: images[0]?.url ?? null,
      images,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,

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
  } catch (err: any) {
    console.error('[public/producto] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        ...(debug ? { debug: { message: String(err?.message || err) } } : null),
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
