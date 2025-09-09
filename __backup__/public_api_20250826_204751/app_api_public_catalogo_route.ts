export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type OfferLite = {
  id: number;
  title: string;
  discountType: 'PERCENT' | 'AMOUNT';
  discountVal: number;
  productId: number | null;
  categoryId: number | null;
};

function applyBestOffer(price: number | null, offers: OfferLite[]) {
  if (price == null)
    return {
      priceOriginal: null as number | null,
      priceFinal: null as number | null,
      appliedOffer: null as OfferLite | null,
    };
  let best = { final: price, offer: null as OfferLite | null };
  for (const o of offers) {
    let final = price;
    if (o.discountType === 'PERCENT') final = Math.max(0, price * (1 - o.discountVal / 100));
    else final = Math.max(0, price - o.discountVal);
    if (final < best.final) best = { final, offer: o };
  }
  return { priceOriginal: price, priceFinal: best.final, appliedOffer: best.offer };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const category = url.searchParams.get('category');
  const subcategory = url.searchParams.get('subcategory');
  const min = url.searchParams.get('min');
  const max = url.searchParams.get('max');
  const order = url.searchParams.get('order') || 'newest'; // newest|price_asc|price_desc|name
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const perPage = Math.min(48, Math.max(1, Number(url.searchParams.get('perPage') || '12')));

  // Filtros base
  const where: any = { status: 'ACTIVE' as const };
  if (q) {
    // Nota: sin 'mode' por SQLite; búsqueda simple
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (category) where.category = { slug: category };
  if (subcategory) where.subcategory = { slug: subcategory };
  const priceFilter: any = {};
  if (min) priceFilter.gte = Number(min);
  if (max) priceFilter.lte = Number(max);
  if (Object.keys(priceFilter).length) where.price = priceFilter;

  // Orden
  let orderBy: any = [{ updatedAt: 'desc' }];
  if (order === 'price_asc') orderBy = [{ price: 'asc' }];
  else if (order === 'price_desc') orderBy = [{ price: 'desc' }];
  else if (order === 'name') orderBy = [{ name: 'asc' }];
  else orderBy = [{ updatedAt: 'desc' }];

  const total = await prisma.product.count({ where });

  const items = await prisma.product.findMany({
    where,
    orderBy,
    take: perPage,
    skip: (page - 1) * perPage,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      subcategory: { select: { id: true, name: true, slug: true } },
      images: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { url: true, alt: true, sortOrder: true },
      },
    },
  });

  // Ofertas vigentes (una sola query)
  const now = new Date();
  const offers = await prisma.offer.findMany({
    where: {
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    select: {
      id: true,
      title: true,
      discountType: true,
      discountVal: true,
      productId: true,
      categoryId: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const out = items.map((p) => {
    const applicable = offers.filter(
      (o) =>
        (o.productId != null && o.productId === p.id) ||
        (o.categoryId != null && o.categoryId === p.categoryId),
    );
    const calc = applyBestOffer(p.price as number | null, applicable as OfferLite[]);
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      priceOriginal: calc.priceOriginal,
      priceFinal: calc.priceFinal,
      appliedOffer: calc.appliedOffer,
      sku: p.sku,
      status: p.status,
      category: p.category,
      subcategory: p.subcategory,
      images: p.images,
    };
  });

  return NextResponse.json({ ok: true, page, perPage, total, items: out });
}
