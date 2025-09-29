// lib/pricing.ts
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
  const v = Math.max(0, Number(val) || 0);
  if (type === 'PERCENT') {
    // clamp porcentajes negativos y redondeo a centavos
    return Math.max(0, Math.round(price * (1 - v / 100) * 100) / 100);
  }
  return Math.max(0, Math.round((price - v) * 100) / 100);
}

// Activa si (startAt es null OR startAt <= now) AND (endAt es null OR endAt >= now)
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

// ---- helpers de matching / prioridad ----
/** prioridad por alcance (más alto = más específico) */
function matchRank(
  o: { productId: number | null; categoryId: number | null; tagId: number | null },
  p: { id: number; categoryId: number | null; tags?: number[] },
): 3 | 2 | 1 | 0 | -1 {
  if (o.productId != null && o.productId === p.id) return 3; // producto
  if (o.categoryId != null && o.categoryId === p.categoryId) return 2; // categoría
  if (o.tagId != null && (p.tags || []).includes(o.tagId)) return 1; // tag
  if (o.productId == null && o.categoryId == null && o.tagId == null) return 0; // general
  return -1; // no matchea
}

function better(
  current: { final: number; rank: number; offAbs: number } | null,
  candidate: { final: number; rank: number; offAbs: number },
) {
  if (!current) return true;
  if (candidate.final < current.final) return true;
  if (candidate.final > current.final) return false;
  // mismo final → mayor prioridad por alcance
  if (candidate.rank > current.rank) return true;
  if (candidate.rank < current.rank) return false;
  // mismo final y misma prioridad → mayor descuento absoluto
  return candidate.offAbs > current.offAbs;
}

// --- API individual (compatibilidad) ---
export async function bestOfferFor(
  productId: number,
  categoryId?: number | null,
  tagIds?: number[],
) {
  const prisma = createPrisma();
  const now = new Date();

  const ors: any[] = [
    { productId }, // por producto
  ];
  if (categoryId) ors.push({ categoryId }); // por categoría
  if (tagIds && tagIds.length) ors.push({ tagId: { in: tagIds } }); // por tag
  // ofertas generales (sin destino)
  ors.push({ productId: null, categoryId: null, tagId: null });

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
  let decision: { final: number; rank: number; offAbs: number } | null = null;

  for (const o of offers) {
    const rank = matchRank(
      { productId: o.productId, categoryId: o.categoryId, tagId: o.tagId },
      { id: p.id, categoryId: p.categoryId, tags: p.tags },
    );
    if (rank < 0) continue;

    const final = apply(o.discountType as DiscountType, p.price, Number(o.discountVal));
    const offAbs = Math.max(0, p.price - final);

    const cand = { final, rank, offAbs };
    if (better(decision, cand)) {
      decision = cand;
      best = {
        id: o.id,
        type: o.discountType as DiscountType,
        val: Number(o.discountVal),
        label: labelFor(o.discountType as DiscountType, Number(o.discountVal)),
        endAt: o.endAt,
      };
    }
  }

  return {
    priceOriginal: p.price,
    priceFinal: decision ? decision.final : p.price,
    offer: best,
  };
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
  if (prodIds.length) ors.push({ productId: { in: prodIds } }); // por producto
  if (catIds.length) ors.push({ categoryId: { in: catIds } }); // por categoría
  if (tagIds.length) ors.push({ tagId: { in: tagIds } }); // por tag
  // agregar SIEMPRE ofertas generales
  ors.push({ productId: null, categoryId: null, tagId: null });

  const offers = await prisma.offer.findMany({
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
  });

  // baseline
  for (const p of products) {
    const po = p.price;
    result.set(p.id, { priceOriginal: po, priceFinal: po, offer: null });
  }

  // aplicar ofertas con prioridad y desempate
  for (const p of products) {
    if (p.price == null) continue;

    let chosen: OfferInfo | null = null;
    let decision: { final: number; rank: number; offAbs: number } | null = null;

    for (const o of offers) {
      const rank = matchRank(
        { productId: o.productId, categoryId: o.categoryId, tagId: o.tagId },
        p,
      );
      if (rank < 0) continue;

      const final = apply(o.discountType as DiscountType, p.price, Number(o.discountVal));
      const offAbs = Math.max(0, p.price - final);

      const cand = { final, rank, offAbs };
      if (better(decision, cand)) {
        decision = cand;
        chosen = {
          id: o.id,
          type: o.discountType as DiscountType,
          val: Number(o.discountVal),
          label: labelFor(o.discountType as DiscountType, Number(o.discountVal)),
          endAt: o.endAt,
        };
      }
    }

    if (decision) {
      result.set(p.id, {
        priceOriginal: p.price,
        priceFinal: decision.final,
        offer: chosen,
      });
    }
  }

  return result;
}
