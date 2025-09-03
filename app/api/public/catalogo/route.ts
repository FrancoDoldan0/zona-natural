export const runtime = 'edge';
import { NextRequest } from 'next/server';
import { json } from '@/lib/json';
import prisma from '@/lib/prisma';
import { computePricesBatch } from '@/lib/pricing';

function parseBool(v?: string | null) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const perPage = Math.min(60, Math.max(1, parseInt(url.searchParams.get('perPage') || '12', 10)));
  const categoryId = parseInt(url.searchParams.get('categoryId') || '', 10);
  const subcategoryId = parseInt(url.searchParams.get('subcategoryId') || '', 10);

  // --- multi-tag + modo de match (any/all) ---
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
  const sort = (url.searchParams.get('sort') || '-id').toLowerCase();

  const where: any = { status: 'ACTIVE' };
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
      { sku: { contains: q } },
    ];
  }
  if (Number.isFinite(categoryId)) where.categoryId = categoryId;
  if (Number.isFinite(subcategoryId)) where.subcategoryId = subcategoryId;

  if (tagIds.length) {
    if (match === 'all') {
      // requiere TODOS los tags (intersección): AND de sub-condiciones
      where.AND = (where.AND || []).concat(
        tagIds.map((id) => ({ productTags: { some: { tagId: id } } })),
      );
    } else {
      // default: ANY de los tags (unión)
      where.productTags = { some: { tagId: { in: tagIds } } };
    }
  }

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {};
    if (Number.isFinite(minPrice)) where.price.gte = minPrice;
    if (Number.isFinite(maxPrice)) where.price.lte = maxPrice;
  }

  const orderBy =
    sort === 'price'
      ? { price: 'asc' }
      : sort === '-price'
        ? { price: 'desc' }
        : sort === 'name'
          ? { name: 'asc' }
          : sort === '-name'
            ? { name: 'desc' }
            : { id: 'desc' };

  const skip = (page - 1) * perPage;

  const [total, itemsRaw] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: perPage,
      orderBy,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
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
    const pr = priced.get(p.id)!;
    const hasDiscount =
      pr.priceOriginal != null && pr.priceFinal != null && pr.priceFinal < pr.priceOriginal;
    const discountPercent = hasDiscount
      ? Math.round((1 - pr.priceFinal / pr.priceOriginal) * 100)
      : 0;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      cover: p.images?.[0]?.url || null,
      priceOriginal: pr.priceOriginal,
      priceFinal: pr.priceFinal,
      offer: pr.offer,
      hasDiscount,
      discountPercent,
    };
  });

  // Filtros por precio FINAL y onSale (post query, dentro de la página)
  if (onSale) items = items.filter((i) => i.hasDiscount);
  if (Number.isFinite(minFinal))
    items = items.filter((i) => (i.priceFinal ?? Infinity) >= minFinal);
  if (Number.isFinite(maxFinal))
    items = items.filter((i) => (i.priceFinal ?? -Infinity) <= maxFinal);

  // Orden adicional por precio FINAL (post query)
  if (sort === 'final') {
    items.sort(
      (a: any, b: any) =>
        (a.priceFinal ?? Number.POSITIVE_INFINITY) - (b.priceFinal ?? Number.POSITIVE_INFINITY),
    );
  } else if (sort === '-final') {
    items.sort(
      (a: any, b: any) =>
        (b.priceFinal ?? Number.NEGATIVE_INFINITY) - (a.priceFinal ?? Number.NEGATIVE_INFINITY),
    );
  }

  const filteredTotal = items.length; // items de esta página luego de post-filtros
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
      sort,
    },
    items,
  });
}
