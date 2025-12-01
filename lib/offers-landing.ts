// lib/offers-landing.ts
import { createPrisma } from "@/lib/prisma-edge";
import { computePricesBatch } from "@/lib/pricing";
import { publicR2Url, r2List } from "@/lib/storage";

const prisma = createPrisma();

type ProductTagRow = { tagId: number };
type ProductImageRow = { key: string | null };

type ProductVariantRow = {
  id: number;
  label: string;
  price: number | null;
  priceOriginal: number | null;
  sku: string | null;
  stock: number | null;
  sortOrder: number;
  active: boolean;
};

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null;
  categoryId: number | null;
  images?: ProductImageRow[];
  productTags?: ProductTagRow[];
  variants?: ProductVariantRow[];
};

export type LandingOffer = {
  id: number;
  name: string;
  slug: string;
  cover: string | null;
  status: string | null;
  priceOriginal: number | null;
  priceFinal: number | null;
  offer: any | null;
  hasDiscount: boolean;
  discountPercent: number;
  hasVariants: boolean;
  variants: {
    id: number;
    label: string;
    priceOriginal: number | null;
    priceFinal: number | null;
    sku: string | null;
    stock: number | null;
    sortOrder: number;
    active: boolean;
  }[];
};

/**
 * Devuelve TODOS los productos en oferta para usar tanto en:
 *  - landing ("Mejores ofertas")
 *  - página /ofertas
 *
 * Incluye:
 *  - Productos con Offer.productId activo (ventana de fechas)
 *  - Productos con variantes donde priceOriginal > price
 *
 * Y luego calcula priceOriginal/priceFinal con la misma lógica
 * que /api/public/catalogo (computePricesBatch + variantes).
 */
export async function getAllOffersRaw(): Promise<LandingOffer[]> {
  const now = new Date();

  // 1) Productos con Offer.productId activo
  const directOffers = await prisma.offer.findMany({
    where: {
      productId: { not: null },
      AND: [
        {
          OR: [
            { startAt: null },
            { startAt: { lte: now } },
          ],
        },
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    },
    select: { productId: true },
  });

  const productIds = new Set<number>();
  for (const o of directOffers) {
    if (o.productId != null) productIds.add(o.productId);
  }

  // 2) Productos con variantes con descuento manual
  const variantDiscounts = await prisma.productVariant.findMany({
    where: {
      active: true,
      price: { not: null },
      priceOriginal: { not: null },
    },
    select: {
      productId: true,
      price: true,
      priceOriginal: true,
    },
  });

  for (const v of variantDiscounts) {
    if (
      v.productId != null &&
      typeof v.price === "number" &&
      typeof v.priceOriginal === "number" &&
      v.price < v.priceOriginal
    ) {
      productIds.add(v.productId);
    }
  }

  // Si no hay candidatos, no hay ofertas
  if (!productIds.size) return [];

  // 3) Leemos sólo esos productos + relaciones necesarias
  const products = await prisma.product.findMany({
    where: { id: { in: Array.from(productIds) } },
    orderBy: { id: "desc" },
    include: {
      images: { select: { key: true } },
      productTags: { select: { tagId: true } },
      variants: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          label: true,
          price: true,
          priceOriginal: true,
          sku: true,
          stock: true,
          sortOrder: true,
          active: true,
        },
      },
    },
  });

  const typedItems = products as (ProductRow & { hasVariants?: boolean })[];

  // 4) computePricesBatch igual que /api/public/catalogo
  const bare = typedItems.map((p) => ({
    id: p.id,
    price: (p.price ?? null) as number | null,
    categoryId: (p.categoryId ?? null) as number | null,
    tags: (p.productTags ?? []).map((t: ProductTagRow) => t.tagId),
  }));

  let priced: Map<
    number,
    {
      priceOriginal: number | null;
      priceFinal: number | null;
      offer?: any;
    }
  >;

  try {
    priced = await computePricesBatch(bare);
  } catch (e) {
    console.error(
      "[landing/offers] computePricesBatch falló, fallback a precio base:",
      e
    );
    priced = new Map();
    for (const b of bare) {
      const v = typeof b.price === "number" ? b.price : null;
      priced.set(b.id, {
        priceOriginal: v,
        priceFinal: v,
        offer: null,
      });
    }
  }

  // 5) Resolver cover (DB o, en fallback, R2) — igual que en /catalogo
  async function resolveCoverKey(p: {
    id: number;
    images?: ProductImageRow[];
  }) {
    const keysFromDb = (Array.isArray(p.images) ? p.images : [])
      .map((i) => i?.key)
      .filter(Boolean) as string[];

    if (keysFromDb.length > 0) return keysFromDb[0];

    try {
      const prefix = `products/${p.id}/`;
      const listed = await r2List(prefix, 1);
      const first =
        Array.isArray(listed) && listed[0]
          ? typeof listed[0] === "string"
            ? listed[0]
            : (listed[0] as any).key
          : null;
      return first || null;
    } catch {
      return null;
    }
  }

  // 6) Mapeo igual que /api/public/catalogo
  const mapped = await Promise.all(
    typedItems.map(async (p) => {
      const pr = priced.get(p.id);

      const basePriceOriginal =
        pr?.priceOriginal ??
        (typeof p.price === "number" ? p.price : null);
      const basePriceFinal =
        pr?.priceFinal ?? basePriceOriginal;

      const hasBase =
        typeof basePriceOriginal === "number" &&
        typeof basePriceFinal === "number" &&
        basePriceOriginal > 0;
      const offerRatio = hasBase
        ? (basePriceFinal as number) / (basePriceOriginal as number)
        : 1;

      let priceOriginal: number | null = basePriceOriginal;
      let priceFinal: number | null = basePriceFinal;

      const activeVariants = Array.isArray(p.variants)
        ? p.variants
        : [];

      const variants = activeVariants.map((v) => {
        const manualOrig =
          typeof v.priceOriginal === "number"
            ? v.priceOriginal
            : typeof v.price === "number"
            ? v.price
            : null;

        const manualFinal =
          typeof v.price === "number" ? v.price : manualOrig;

        const vOrig = manualOrig;
        const vFinal =
          manualFinal != null ? manualFinal * (offerRatio || 1) : null;

        return {
          ...v,
          priceOriginal: vOrig,
          priceFinal: vFinal,
        };
      });

      if (variants.length) {
        const finals = variants
          .map((v) => v.priceFinal)
          .filter((x): x is number => typeof x === "number");
        const origs = variants
          .map((v) => v.priceOriginal)
          .filter((x): x is number => typeof x === "number");

        if (finals.length) priceFinal = Math.min(...finals);
        if (origs.length) priceOriginal = Math.min(...origs);
      }

      const hasDiscount =
        priceOriginal != null &&
        priceFinal != null &&
        (priceFinal as number) < (priceOriginal as number);

      const discountPercent =
        hasDiscount && priceOriginal && priceFinal
          ? Math.round(
              (1 - (priceFinal as number) / (priceOriginal as number)) * 100
            )
          : 0;

      const coverKey = await resolveCoverKey(p);
      const cover = coverKey ? publicR2Url(coverKey) : null;

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
        hasVariants: variants.length > 0,
        variants,
      } satisfies LandingOffer;
    })
  );

  // Por seguridad, nos quedamos sólo con los que REALMENTE tienen descuento
  const discounted = mapped.filter((i) => i.hasDiscount);

  return discounted;
}
