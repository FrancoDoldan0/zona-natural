// app/api/public/catalogo/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/json';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';
import { publicR2Url } from '@/lib/storage';
import type { Prisma } from '@prisma/client';

const prisma = createPrisma();

function parseBool(v?: string | null) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = Math.min(60, Math.max(1, parseInt(url.searchParams.get('perPage') || '12', 10)));
    const categoryId = parseInt(url.searchParams.get('categoryId') || '', 10);
    const subcategoryId = parseInt(url.searchParams.get('subcategoryId') || '', 10);

    const tagIdSingle = parseInt(url.searchParams.get('tagId') || '', 10);
    const tagIdsCsv = (url.searchParams.get('tagIds') || '').trim();
    const tagIdList = url.searchParams.getAll('tagId').map((s) => parseInt(s, 10));
    const tagIds = [
      ...tagIdList,
      ...(tagIdsCsv ? tagIdsCsv.split(',').map((s) => parseInt(s.trim(), 10)) : []),
      ...(Number.isFinite(tagIdSingle) ? [tagIdSingle] : []),
    ].filter(Number.isFinite) as number[];
    const match = (url.searchParams.get('match') || 'any').toLowerCase(); // "any" | "all"

    const minPrice = parseFloat(url.searchParams.get('minPrice') || '');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '');
    const minFinal = parseFloat(url.searchParams.get('minFinal') || '');
    const maxFinal = parseFloat(url.searchParams.get('maxFinal') || '');
    const onSale = parseBool(url.searchParams.get('onSale'));

    // ✅ Público: mostrar ACTIVE + AGOTADO
    const where: any = { status: { in: ['ACTIVE', 'AGOTADO'] } };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (Number.isFinite(categoryId)) where.categoryId = categoryId;
    if (Number.isFinite(subcategoryId)) where.subcategoryId = subcategoryId;

    if (tagIds.length) {
      if (match === 'all') {
        where.AND = (where.AND || []).concat(
          tagIds.map((id) => ({ productTags: { some: { tagId: id } } })),
        );
      } else {
        where.productTags = { some: { tagId: { in: tagIds } } };
      }
    }

    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      where.price = {};
      if (Number.isFinite(minPrice)) where.price.gte = minPrice;
      if (Number.isFinite(maxPrice)) where.price.lte = maxPrice;
    }

    // --- Orden principal ---
    const sortParam = (url.searchParams.get('sort') || '-id').toLowerCase();
    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sortParam) {
      case 'price':
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case '-price':
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name':
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case '-name':
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'id':
      case 'id_asc':
        orderBy = { id: 'asc' };
        break;
      case '-id':
      default:
        orderBy = { id: 'desc' };
        break;
    }

    const skip = (page - 1) * perPage;

    const [total, itemsRaw] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
        include: {
          // ❗️Sin `take`: algunos runtimes omiten la relación si se usa `take` en include.
          // Ordenamos para que venga primero la portada y luego por sortOrder.
          images: {
            select: { key: true, isCover: true, sortOrder: true },
            orderBy: [{ isCover: 'desc' }, { sortOrder: 'asc' }, { key: 'asc' }],
          },
          productTags: { select: { tagId: true } },
        },
      }),
    ]);

    const bare = itemsRaw.map((p: any) => ({
      id: p.id,
      price: p.price,
      categoryId: p.categoryId,
      tags: (p.productTags || []).map((t: any) => t.tagId),
    }));
    const priced = await computePricesBatch(bare);

    let items = itemsRaw.map((p: any) => {
      const pr = priced.get(p.id);
      const priceOriginal = pr?.priceOriginal ?? null;
      const priceFinal = pr?.priceFinal ?? null;

      const hasDiscount =
        priceOriginal != null && priceFinal != null && priceFinal < priceOriginal;

      const discountPercent =
        hasDiscount && priceOriginal && priceFinal
          ? Math.round((1 - priceFinal / priceOriginal) * 100)
          : 0;

      // ✅ Elegimos la primera imagen ya ordenada (portada primero). Si no hay, null.
      const firstImg = (p.images && p.images[0]) || null;
      const cover = firstImg?.key ? publicR2Url(firstImg.key) : null;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        cover,
        status: p.status ?? null,
        priceOriginal,
        priceFinal,
        offer: pr?.offer ?? null,
        hasDiscount,
        discountPercent,
      };
    });

    // Post-filtros por precio FINAL
    if (onSale) items = items.filter((i) => i.hasDiscount);
    if (Number.isFinite(minFinal)) items = items.filter((i) => (i.priceFinal ?? Infinity) >= minFinal);
    if (Number.isFinite(maxFinal)) items = items.filter((i) => (i.priceFinal ?? -Infinity) <= maxFinal);

    // Orden adicional por precio FINAL (post query)
    if (sortParam === 'final') {
      items.sort(
        (a: any, b: any) =>
          (a.priceFinal ?? Number.POSITIVE_INFINITY) - (b.priceFinal ?? Number.POSITIVE_INFINITY),
      );
    } else if (sortParam === '-final') {
      items.sort(
        (a: any, b: any) =>
          (b.priceFinal ?? Number.NEGATIVE_INFINITY) - (a.priceFinal ?? Number.NEGATIVE_INFINITY),
      );
    }

    const filteredTotal = items.length;
    const pageCount = Math.ceil((total ?? 0) / perPage);
    const filteredPageCount = Math.ceil(filteredTotal / perPage);

    return json({
      ok: true,
      page,
      perPage,
      total,
      pageCount,
      filteredTotal,
      filteredPageCount,
      appliedFilters: {
        q,
        categoryId: Number.isFinite(categoryId) ? categoryId : null,
        subcategoryId: Number.isFinite(subcategoryId) ? subcategoryId : null,
        tagIds,
        match,
        minPrice: Number.isFinite(minPrice) ? minPrice : null,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
        minFinal: Number.isFinite(minFinal) ? minFinal : null,
        maxFinal: Number.isFinite(maxFinal) ? maxFinal : null,
        onSale,
        sort: sortParam,
      },
      items,
    });
  } catch (err) {
    console.error('[public/catalogo] error:', err);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
