import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const productId = Number(process.argv[2] || 8);

console.log('DATABASE_URL =', process.env.DATABASE_URL);

const p = await prisma.product.findUnique({
  where: { id: productId },
  include: { category: true, productTags: { select: { tagId: true } } },
});
if (!p) {
  console.error('Producto no encontrado:', productId);
  process.exit(2);
}

const price = p.price ?? null;
const categoryId = p.categoryId ?? null;
const tags = (p.productTags ?? []).map((t) => t.tagId);
const now = new Date();

const ors = [{ productId }];
if (categoryId) ors.push({ categoryId });
if (tags.length) ors.push({ tagId: { in: tags } });

// TODAS las ofertas (sin filtro de fechas), Ãºltimas 20
const allOffers = await prisma.offer.findMany({
  where: { OR: ors },
  orderBy: { id: 'desc' },
  take: 20,
  select: {
    id: true,
    title: true,
    discountType: true,
    discountVal: true,
    productId: true,
    categoryId: true,
    tagId: true,
    startAt: true,
    endAt: true,
  },
});

// ACTIVAS ahora (mismo filtro que el pricing)
const activeOffers = await prisma.offer.findMany({
  where: {
    OR: ors,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  },
  orderBy: { id: 'desc' },
  select: {
    id: true,
    title: true,
    discountType: true,
    discountVal: true,
    productId: true,
    categoryId: true,
    tagId: true,
    startAt: true,
    endAt: true,
  },
});

// apply() igual que tu cÃ³digo
function apply(type, price, val) {
  if (price == null || !Number.isFinite(price)) return price;
  const v = Number(val) || 0;
  if (type === 'PERCENT') return Math.max(0, Math.round(price * (1 - v / 100) * 100) / 100);
  return Math.max(0, Math.round((price - v) * 100) / 100);
}

// Mejor oferta
let final = price,
  best = null;
for (const o of activeOffers) {
  const f = apply(o.discountType, price, o.discountVal);
  if (best === null || (f ?? Infinity) < (final ?? Infinity)) {
    final = f;
    best = o;
  }
}

console.log(
  JSON.stringify(
    {
      product: { id: p.id, price, categoryId, tags },
      now,
      allOffers,
      activeOffers,
      computed: { final, best },
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
process.exit(0);
