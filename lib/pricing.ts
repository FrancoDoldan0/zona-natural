import { createPrisma } from '@/lib/prisma-edge';

type DiscountType = 'PERCENT' | 'AMOUNT';
export type OfferInfo = {
  id: number;
  type: DiscountType;
  val: number;
  label: string;
  endAt: Date | null;
};

function apply(type: DiscountType, price: number, val: number) {
  if (!Number.isFinite(price)) return price;
  const v = Number(val) || 0;
  if (type === 'PERCENT') {
    return Math.max(0, Math.round(price * (1 - v / 100) * 100) / 100);
  }
  return Math.max(0, Math.round((price - v) * 100) / 100);
}

// Activa si (startAt es null OR startAt <= now) AND (endAt es null OR endAt >= now)
// ⚠️ Importante: NO usar `as const` aquí para que los arrays no sean readonly.
function activeNow(now: Date) {
  return {
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };
}

export function labelFor(type: DiscountType, val: number) {
  return type === 'PERCENT' ? `-${val}%` : `-$${val}`;
}

// --- API individual (compatibilidad) ---
export async function bestOfferFor(
  productId: number,
  categoryId?: number | null,
  tagIds?: number[],
) {
  const prisma = createPrisma();
  const now = new Date();
  const ors: any[] = [{ productId }];
  if (categoryId) ors.push({ categoryId });
  if (tagIds && tagIds.length) ors.push({ tagId: { in: tagIds } });

  return prisma.offer.findMany({
    where: { OR: ors, ...activeNow(now) },
    orderBy: { id: 'desc' },
  });
}

export async function computePriceForProduct(p: {
  id: number;
  price: number | null;
  categoryId: number | null;
  tags?: number[];
}) {
  if (p.price == null)
    return {
      priceOriginal: null as number | null,
      priceFinal: null as number | null,
      offer: null as OfferInfo | null,
    };

  const offers = await bestOfferFor(p.id, p.categoryId ?? null, p.tags ?? []);
  let best: OfferInfo | null = null;
  let final = p.price;

  for (const o of offers) {
    const f = apply(o.discountType as DiscountType, p.price, Number(o.discountVal));
    if (best === null || f < final) {
      final = f;
      best = {
        id: o.id,
        type: o.discountType as DiscountType,
        val: Number(o.discountVal),
        label: labelFor(o.discountType as DiscountType, Number(o.discountVal)),
        endAt: o.endAt,
      };
    }
  }
  return { priceOriginal: p.price, priceFinal: final, offer: best };
}

// --- API batch (recomendada para listas) ---
type BareProd = { id: number; price: number | null; categoryId: number | null; tags: number[] };
export async function computePricesBatch(products: BareProd[]) {
  const prisma = createPrisma();
  const now = new Date();
  const result = new Map<
    number,
    { priceOriginal: number | null; priceFinal: number | null; offer: OfferInfo | null }
  >();
  if (products.length === 0) return result;

  const prodIds = products.map((p) => p.id);
  const catIds = Array.from(new Set(products.map((p) => p.categoryId).filter(Boolean) as number[]));
  const tagIds = Array.from(new Set(products.flatMap((p) => p.tags || [])));

  const ors: any[] = [];
  if (prodIds.length) ors.push({ productId: { in: prodIds } });
  if (catIds.length) ors.push({ categoryId: { in: catIds } });
  if (tagIds.length) ors.push({ tagId: { in: tagIds } });

  const offers = ors.length
    ? await prisma.offer.findMany({
        where: { OR: ors, ...activeNow(now) },
        select: {
          id: true,
          discountType: true,
          discountVal: true,
          endAt: true,
          productId: true,
          categoryId: true,
          tagId: true,
        },
      })
    : [];

  // baseline
  for (const p of products) {
    const po = p.price;
    result.set(p.id, { priceOriginal: po, priceFinal: po, offer: null });
  }

  // aplicar ofertas
  for (const o of offers) {
    for (const p of products) {
      const matches =
        (o.productId && o.productId === p.id) ||
        (o.categoryId && o.categoryId === p.categoryId) ||
        (o.tagId && (p.tags || []).includes(o.tagId));

      if (!matches || p.price == null) continue;

      const cur = result.get(p.id)!;
      const f = apply(o.discountType as DiscountType, p.price, Number(o.discountVal));

      if (cur.priceFinal == null || f < cur.priceFinal) {
        result.set(p.id, {
          priceOriginal: p.price,
          priceFinal: f,
          offer: {
            id: o.id,
            type: o.discountType as DiscountType,
            val: Number(o.discountVal),
            label: labelFor(o.discountType as DiscountType, Number(o.discountVal)),
            endAt: o.endAt,
          },
        });
      }
    }
  }

  return result;
}
