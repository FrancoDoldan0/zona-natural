// app/api/public/catalogo/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { json } from '@/lib/json';
import { createPrisma } from '@/lib/prisma-edge';
import { computePricesBatch } from '@/lib/pricing';
import { publicR2Url, r2List } from '@/lib/storage';
import type { Prisma } from '@prisma/client';

const prisma = createPrisma();

function parseBool(v?: string | null) {
  if (!v) return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

// Normaliza where.AND para poder ir agregando condiciones sin romper tipos
function appendAND(
  where: Prisma.ProductWhereInput,
  clause: Prisma.ProductWhereInput | Prisma.ProductWhereInput[],
) {
  const cur = where.AND;
  const add = Array.isArray(clause) ? clause : [clause];
  if (!cur) {
    where.AND = add;
  } else if (Array.isArray(cur)) {
    where.AND = [...cur, ...add];
  } else {
    where.AND = [cur, ...add];
  }
}

// Tipos auxiliares para lo que seleccionamos de Prisma
type ProductTagRow = { tagId: number };
type ProductImageRow = { key: string | null };

// 🆕 filas de variante
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
  status?: string | null;
  price?: number | null;
  categoryId?: number | null;
  images?: ProductImageRow[];
  productTags?: ProductTagRow[];

  hasVariants?: boolean;
  variants?: ProductVariantRow[];
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const debug =
    url.searchParams.get('_debug') === '1' ||
    url.searchParams.get('debug') === '1';

  try {
    // 🔍 texto libre
    const rawQ =
      url.searchParams.get('q') ||
      url.searchParams.get('query') ||
      url.searchParams.get('search') ||
      url.searchParams.get('term') ||
      '';
    const q = rawQ.trim();

    const page = Math.max(
      1,
      parseInt(url.searchParams.get('page') || '1', 10),
    );
    const perPage = Math.min(
      9999,
      Math.max(1, parseInt(url.searchParams.get('perPage') || '9999', 10)),
    );
    const categoryId = parseInt(
      url.searchParams.get('categoryId') || '',
      10,
    );
    const subcategoryId = parseInt(
      url.searchParams.get('subcategoryId') || '',
      10,
    );

    // 🔹 lista de IDs explícita (para landing, ofertas, etc.)
    const idsCsv = (url.searchParams.get('ids') || '').trim();
    const ids =
      idsCsv.length > 0
        ? idsCsv
            .split(',')
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n)) as number[]
        : [];

    // tags
    const tagIdSingle = parseInt(
      url.searchParams.get('tagId') || '',
      10,
    );
    const tagIdsCsv = (url.searchParams.get('tagIds') || '').trim();
    const tagIdList = url
      .searchParams.getAll('tagId')
      .map((s) => parseInt(s, 10));
    const tagIds = [
      ...tagIdList,
      ...(tagIdsCsv
        ? tagIdsCsv.split(',').map((s) => parseInt(s.trim(), 10))
        : []),
      ...(Number.isFinite(tagIdSingle) ? [tagIdSingle] : []),
    ].filter(Number.isFinite) as number[];
    const match = (url.searchParams.get('match') || 'any').toLowerCase();

    const minPrice = parseFloat(url.searchParams.get('minPrice') || '');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '');
    const minFinal = parseFloat(url.searchParams.get('minFinal') || '');
    const maxFinal = parseFloat(url.searchParams.get('maxFinal') || '');
    const onSale = parseBool(url.searchParams.get('onSale'));

    // ─────────────────────────────────────────────────────────────
    // status=active  → ACTIVE + AGOTADO
    // status=all     → todos excepto ARCHIVED (DEFAULT)
    // status=raw     → sin filtro de status
    // ─────────────────────────────────────────────────────────────
    const statusParam = (
      url.searchParams.get('status') || 'all'
    ).toLowerCase() as 'active' | 'all' | 'raw';

    // Base del WHERE (SIN FILTRO DE ESTADO)
    const baseWhere: Prisma.ProductWhereInput = {};

    // 🔑 Filtro por IDs explícitos (?ids=1,2,3)
    if (ids.length) {
      baseWhere.id = { in: ids };
    }

    // Búsqueda de texto (AND con el resto de filtros)
    if (q) {
      const textOR: Prisma.ProductWhereInput['OR'] = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
      appendAND(baseWhere, { OR: textOR || [] });
    }

    if (Number.isFinite(categoryId)) baseWhere.categoryId = categoryId;
    if (Number.isFinite(subcategoryId))
      baseWhere.subcategoryId = subcategoryId;

    // Tags
    if (tagIds.length) {
      if (match === 'all') {
        // requiere que tenga TODOS los tags
        const allConds: Prisma.ProductWhereInput[] = tagIds.map((id) => ({
          productTags: { some: { tagId: id } },
        }));
        appendAND(baseWhere, allConds);
      } else {
        // cualquiera de los tags
        baseWhere.productTags = {
          some: { tagId: { in: tagIds } },
        };
      }
    }

    // Precio base (pre-discount)
    if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
      baseWhere.price = {};
      if (Number.isFinite(minPrice)) baseWhere.price.gte = minPrice;
      if (Number.isFinite(maxPrice)) baseWhere.price.lte = maxPrice;
    }

    // Orden principal
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

    // Ejecutamos SIEMPRE sin filtro de estado en DB
    const [total, itemsRaw] = await Promise.all([
      prisma.product.count({ where: baseWhere }),
      prisma.product.findMany({
        where: baseWhere,
        skip,
        take: perPage,
        orderBy,
        include: {
          images: { select: { key: true } },
          productTags: { select: { tagId: true } },
          // 🆕 incluir variantes activas
          variants: {
            where: { active: true },
            orderBy: { sortOrder: 'asc' },
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
      }),
    ]);

    const typedItems = itemsRaw as (ProductRow & {
      hasVariants?: boolean;
    })[];

    // Precios: tolerar fallas en computePricesBatch
    const bare = typedItems.map((p) => ({
      id: p.id,
      price: (p.price ?? null) as number | null,
      categoryId: (p.categoryId ?? null) as number | null,
      tags: (p.productTags ?? []).map((t: ProductTagRow) => t.tagId),
    }));

    let priced: Map<
      number,
      { priceOriginal: number | null; priceFinal: number | null; offer?: any }
    >;
    try {
      priced = await computePricesBatch(bare);
    } catch (e) {
      console.error(
        '[public/catalogo] computePricesBatch falló, fallback a precio base:',
        e,
      );
      priced = new Map();
      for (const b of bare) {
        const v = typeof b.price === 'number' ? b.price : null;
        priced.set(b.id, {
          priceOriginal: v,
          priceFinal: v,
          offer: null,
        });
      }
    }

    // Resolver cover: DB o, si no hay, listar en R2
    async function resolveCoverKey(p: {
      id: number;
      slug?: string | null;
      images?: ProductImageRow[];
    }) {
      const keysFromDb = (Array.isArray(p.images) ? p.images : [])
        .map((i) => i?.key)
        .filter(Boolean) as string[];

      if (keysFromDb.length > 0) return keysFromDb[0];

      // Fallback 1: carpeta por ID (products/123/...)
      const prefixes: string[] = [];
      prefixes.push(`products/${p.id}/`);

      // Fallback 2: archivo suelto o carpeta por slug
      if (p.slug) {
        prefixes.push(`products/${p.slug}`);
        prefixes.push(`products/${p.slug}/`);
      }

      for (const prefix of prefixes) {
        try {
          const listed = await r2List(prefix, 1);
          const first =
            Array.isArray(listed) && listed[0]
              ? typeof listed[0] === 'string'
                ? listed[0]
                : (listed[0] as any).key
              : null;
          if (first) return first;
        } catch {
          // seguimos probando con el siguiente prefijo
        }
      }

      return null;
    }

    // Mapeo base (antes del filtro de estado)
    const mapped = await Promise.all(
      typedItems.map(async (p) => {
        const pr = priced.get(p.id);

        // ====== BASE de ofertas (tabla Offer) ======
        const basePriceOriginal =
          pr?.priceOriginal ?? (typeof p.price === 'number' ? p.price : null);
        const basePriceFinal = pr?.priceFinal ?? basePriceOriginal;

        const hasBase =
          typeof basePriceOriginal === 'number' &&
          typeof basePriceFinal === 'number' &&
          basePriceOriginal > 0;
        const offerRatio = hasBase ? basePriceFinal / basePriceOriginal : 1;

        let priceOriginal: number | null = basePriceOriginal;
        let priceFinal: number | null = basePriceFinal;

        // ====== Variantes: respetar descuentos manuales ======
        const activeVariants = Array.isArray(p.variants) ? p.variants : [];
        const variants = activeVariants.map((v) => {
          // Descuento manual: priceOriginal (antes) vs price (ahora)
          const manualOrig =
            typeof v.priceOriginal === 'number'
              ? v.priceOriginal
              : typeof v.price === 'number'
              ? v.price
              : null;

          const manualFinal =
            typeof v.price === 'number' ? v.price : manualOrig;

          const vOrig = manualOrig;
          const vFinal =
            manualFinal != null ? manualFinal * (offerRatio || 1) : null;

          return {
            ...v,
            priceOriginal: vOrig,
            priceFinal: vFinal,
          };
        });

        // Si hay variantes, usamos el mínimo de ellas para la card
        if (variants.length) {
          const finals = variants
            .map((v) => v.priceFinal)
            .filter((x): x is number => typeof x === 'number');
          const origs = variants
            .map((v) => v.priceOriginal)
            .filter((x): x is number => typeof x === 'number');
          if (finals.length) priceFinal = Math.min(...finals);
          if (origs.length) priceOriginal = Math.min(...origs);
        }

        const hasDiscount =
          priceOriginal != null &&
          priceFinal != null &&
          priceFinal < priceOriginal;

        const discountPercent =
          hasDiscount && priceOriginal && priceFinal
            ? Math.round((1 - priceFinal / priceOriginal) * 100)
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
        };
      }),
    );

    // Filtro de estado EN MEMORIA
    let filtered = mapped;
    if (statusParam === 'active') {
      filtered = filtered.filter((i) => {
        const s = String(i.status || '').toUpperCase();
        return s === 'ACTIVE' || s === 'AGOTADO';
      });
    } else if (statusParam === 'all') {
      filtered = filtered.filter(
        (i) => String(i.status || '').toUpperCase() !== 'ARCHIVED',
      );
    } // raw => sin filtro

    // Post-filtros por precio FINAL
    if (onSale) filtered = filtered.filter((i) => i.hasDiscount);
    if (Number.isFinite(minFinal))
      filtered = filtered.filter(
        (i) => (i.priceFinal ?? Infinity) >= minFinal,
      );
    if (Number.isFinite(maxFinal))
      filtered = filtered.filter(
        (i) => (i.priceFinal ?? -Infinity) <= maxFinal,
      );

    // Orden adicional por precio FINAL (post query)
    if (sortParam === 'final') {
      filtered = filtered
        .slice()
        .sort(
          (a, b) =>
            (a.priceFinal ?? Number.POSITIVE_INFINITY) -
            (b.priceFinal ?? Number.POSITIVE_INFINITY),
        );
    } else if (sortParam === '-final') {
      filtered = filtered
        .slice()
        .sort(
          (a, b) =>
            (b.priceFinal ?? Number.NEGATIVE_INFINITY) -
            (a.priceFinal ?? Number.NEGATIVE_INFINITY),
        );
    }

    const filteredTotal = filtered.length;
    const pageCount = Math.ceil((total ?? 0) / perPage);
    const filteredPageCount = Math.ceil(filteredTotal / perPage);

    return json({
      ok: true,
      page,
      perPage,
      total, // total de la query base (sin estado)
      pageCount,
      filteredTotal, // total luego de aplicar estado + post-filtros
      filteredPageCount,
      appliedFilters: {
        q,
        ids,
        categoryId: Number.isFinite(categoryId) ? categoryId : null,
        subcategoryId: Number.isFinite(subcategoryId)
          ? subcategoryId
          : null,
        tagIds,
        match,
        minPrice: Number.isFinite(minPrice) ? minPrice : null,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
        minFinal: Number.isFinite(minFinal) ? minFinal : null,
        maxFinal: Number.isFinite(maxFinal) ? maxFinal : null,
        onSale,
        sort: sortParam,
        status: statusParam,
        effectiveStatus: statusParam,
        fallbackRaw: false,
      },
      items: filtered,
    });
  } catch (err: any) {
    console.error('[public/catalogo] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'internal_error',
        ...(debug
          ? { debug: { message: String(err?.message || err) } }
          : null),
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
