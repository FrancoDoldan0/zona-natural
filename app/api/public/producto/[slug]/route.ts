// app/api/public/producto/[slug]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';
import { publicR2Url, r2List } from '@/lib/storage';

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

    // Intento 1 (normal): slug + status visible
    // Importante: evitamos orderBy en imágenes para no depender de columnas/migraciones.
    let p: any | null = null;
    try {
      p = await prisma.product.findFirst({
        where: { slug, status: { in: ['ACTIVE', 'AGOTADO'] } },
        include: {
          images: { select: { id: true, key: true } },
          category: { select: { id: true, name: true, slug: true } },
          productTags: { select: { tagId: true } },
        },
      });
    } catch (e) {
      // Algunos setups de Accelerate tienen problemas con enums en filtros: hacemos fallback.
    }

    // Fallback: buscar por slug sin filtrar y luego validamos status en memoria
    if (!p) {
      p = await prisma.product.findUnique({
        where: { slug },
        include: {
          images: { select: { id: true, key: true } },
          category: { select: { id: true, name: true, slug: true } },
          productTags: { select: { tagId: true } },
        },
      });

      // Si no existe o está ARCHIVED/INACTIVE y no queremos exponerlo públicamente → 404
      const st = String(p?.status ?? '').toUpperCase();
      if (!p || st === 'ARCHIVED' || st === 'INACTIVE') {
        return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
      }
    }

    // Mapear imágenes DB → shape público
    let images =
      (p.images ?? []).map((img: any, idx: number) => ({
        id: img.id,
        url: publicR2Url(img.key),
        alt: null,
        sortOrder: idx,
        isCover: idx === 0,
        size: null,
      })) ?? [];

    // Fallback: si no hay filas en DB, listar de R2 por prefijo "products/<id>/"
    let r2Debug: any = null;
    if (images.length === 0) {
      try {
        const objects = await r2List(`products/${p.id}/`, 100);
        const onlyImages = objects.filter((o) => /\.(?:jpe?g|png|webp|gif|avif)$/i.test(o.key));
        onlyImages.sort((a, b) => a.key.localeCompare(b.key, 'es'));
        images = onlyImages.map((o, idx) => ({
          id: -(idx + 1), // ids negativos para denotar "solo R2"
          url: publicR2Url(o.key),
          alt: null,
          sortOrder: idx,
          isCover: idx === 0,
          size: o.size ?? null,
        }));
        if (debug) r2Debug = { listedFromR2: true, count: images.length };
      } catch (e: any) {
        if (debug) r2Debug = { listedFromR2: false, error: String(e?.message || e) };
      }
    }

    // Precios y oferta (mismo helper que catálogo)
    const bare = [
      {
        id: p.id,
        price: p.price as number | null,
        categoryId: p.categoryId as number | null,
        tags: (p.productTags || []).map((t: any) => t.tagId as number),
      },
    ];
    const priced = await computePricesBatch(bare).catch(() => new Map());
    const pr = priced.get(p.id);

    const priceOriginal = pr?.priceOriginal ?? (typeof p.price === 'number' ? p.price : null);
    const priceFinal = pr?.priceFinal ?? priceOriginal;
    const hasDiscount = priceOriginal != null && priceFinal != null && priceFinal < priceOriginal;

    const item = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: typeof p.price === 'number' ? p.price : null,
      sku: p.sku,
      status: p.status as string, // para poder mostrar “AGOTADO” en la UI
      coverUrl: images[0]?.url ?? null,
      images,
      category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : null,

      // datos enriquecidos para la UI
      priceOriginal,
      priceFinal,
      offer: pr?.offer ?? null,
      hasDiscount,
      discountPercent:
        hasDiscount && priceOriginal && priceFinal
          ? Math.round((1 - priceFinal / priceOriginal) * 100)
          : 0,
    };

    return NextResponse.json({ ok: true, item, ...(debug && r2Debug ? { debug: r2Debug } : {}) });
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
