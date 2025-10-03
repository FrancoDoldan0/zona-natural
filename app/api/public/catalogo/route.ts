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

// Helper: construye un OR con los estados permitidos (evita usar `in`/`not` sobre enum)
function statusOR(
  statuses: Array<'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'AGOTADO' | 'ARCHIVED'>,
): Prisma.ProductWhereInput {
  return { OR: statuses.map((s) => ({ status: s })) };
}

// Tipos auxiliares para lo que seleccionamos de Prisma
type ProductTagRow = { tagId: number };
type ProductImageRow = { key: string | null };
type ProductRow = {
  id: number;
  name: string;
  slug: string;
  status?: string | null;
  price?: number | null;
  categoryId?: number | null;
  images?: ProductImageRow[];
  productTags?: ProductTagRow[];
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  try {
    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const perPage = Math.min(60, Math.max(1, parseInt(url.searchParams.get('perPage') || '12', 10)));
    const categoryId = parseInt(url.searchParams.get('categoryId') || '', 10);
    const subcategoryId = parseInt(url.searchParams.get('subcategoryId') || '', 10);

    // tags
    const tagIdSingle = parseInt(url.searchParams.get('tagId') || '', 10);
    const tagIdsCsv = (url.searchParams.get('tagIds') || '').trim();
    const tagIdList = url.searchParams.getAll('tagId').map((s) => parseInt(s, 10));
    const tagIds = [
      ...tagIdList,
      ...(tagIdsCsv ? tagIdsCsv.split(',').map((s) => parseInt(s.trim(), 10)) : []),
      ...(Number.isFinite(tagIdSingle) ? [tagIdSingle] : []),
    ].filter(Number.isFinite) as number[];
    const match = (url.searchParams.get('match') || 'any').toLowerCase();

    const minPrice = parseFloat(url.searchParams.get('minPrice') || '');
    const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '');
    const minFinal = parseFloat(url.searchParams.get('minFinal') || '');
    const maxFinal = parseFloat(url.searchParams.get('maxFinal') || '');
    const onSale = parseBool(url.searchParams.get('onSale'));

    // ─────────────────────────────────────────────────────────────
    // Filtro de estado (ajustable por querystring)
    // status=active  → ACTIVE + AGOTADO
    // status=all     → ACTIVE + INACTIVE + DRAFT + AGOTADO (DEFAULT)  [excluye ARCHIVED]
    // status=raw     → sin filtro de status (debug)
    // ─────────────────────────────────────────────────────────────
    const statusParam = (url.searchParams.get('status') || 'all').toLowerCase();

    // Base del WHERE sin estado (para poder hacer fallback a raw)
    const baseWhere: Prisma.ProductWhereInput = {};

    // Búsqueda de texto
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
    if (Number.isFinite(subcategoryId)) baseWhere.subcategoryId = subcategoryId;

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
        baseWhere.productTags = { some: { tagId: { in: tagIds } } };
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

    // Función que ejecuta la query con un where dado
    async function fetchWithWhere(where: Prisma.ProductWhereInput) {
      const [total, itemsRaw] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          skip,
          take: perPage,
          orderBy,
          include: {
            images: { select: { key: true } },
            productTags: { select: { tagId: true } },
          },
        }),
      ]);
      return { total, itemsRaw: itemsRaw as ProductRow[] };
    }

    // Construyo el where con estado (si corresponde)
    let effectiveStatus: 'active' | 'all' | 'raw' = statusParam as any;
    let statusClause: Prisma.ProductWhereInput | null = null;
    if (statusParam === 'active') {
      statusClause = statusOR(['ACTIVE', 'AGOTADO']);
    } else if (statusParam === 'raw') {
      statusClause = null; // sin filtro
    } else {
      // default: all -> excluye ARCHIVED
      statusClause = statusOR(['ACTIVE', 'INACTIVE', 'DRAFT', 'AGOTADO']);
      effectiveStatus = 'all';
    }

    let total = 0;
    let itemsRaw: ProductRow[] = [];
    let usedFallbackRaw = false;

    try {
      const whereWithStatus: Prisma.ProductWhereInput = { ...baseWhere };
      if (statusClause) appendAND(whereWithStatus, statusClause);
      ({ total, itemsRaw } = await fetchWithWhere(whereWithStatus));
    } catch (e) {
      console.error('[public/catalogo] fallo con filtro de estado, fallback a raw:', e);
      // Fallback a RAW (sin filtro por status)
      ({ total, itemsRaw } = await fetchWithWhere(baseWhere));
      effectiveStatus = 'raw';
      usedFallbackRaw = true;
    }

    // Precios: tolerar fallas en computePricesBatch
    const bare = itemsRaw.map((p) => ({
      id: p.id,
      price: (p.price ?? null) as number | null,
      categoryId: (p.categoryId ?? null) as number | null,
      tags: (p.productTags ?? []).map((t: ProductTagRow) => t.tagId),
    }));

    let priced: Map<number, { priceOriginal: number | null; priceFinal: number | null; offer?: any }>;
    try {
      priced = await computePricesBatch(bare);
    } catch (e) {
      console.error('[public/catalogo] computePricesBatch falló, fallback a precio base:', e);
      priced = new Map();
      for (const b of bare) {
        const v = typeof b.price === 'number' ? b.price : null;
        priced.set(b.id, { priceOriginal: v, priceFinal: v, offer: null });
      }
    }

    // Resolver cover: DB o, si no hay, listar en R2
    async function resolveCoverKey(p: { id: number; images?: ProductImageRow[] }) {
      const keysFromDb = (Array.isArray(p.images) ? p.images : [])
        .map((i) => i?.key)
        .filter(Boolean) as string[];
      if (keysFromDb.length > 0) return keysFromDb[0];

      try {
        const prefix = `products/${p.id}/`;
        const listed = await r2List(prefix, 1);
        const first =
          Array.isArray(listed) && listed[0]
            ? (typeof listed[0] === 'string' ? listed[0] : (listed[0] as any).key)
            : null;
        return first || null;
      } catch {
        return null;
      }
    }

    const items = await Promise.all(
      itemsRaw.map(async (p) => {
        const pr = priced.get(p.id);
        const priceOriginal = pr?.priceOriginal ?? (typeof p.price === 'number' ? p.price : null);
        const priceFinal = pr?.priceFinal ?? priceOriginal;

        const hasDiscount =
          priceOriginal != null && priceFinal != null && priceFinal < priceOriginal;

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
        };
      }),
    );

    // Post-filtros por precio FINAL
    let filtered = items;
    if (onSale) filtered = filtered.filter((i) => i.hasDiscount);
    if (Number.isFinite(minFinal)) filtered = filtered.filter((i) => (i.priceFinal ?? Infinity) >= minFinal);
    if (Number.isFinite(maxFinal)) filtered = filtered.filter((i) => (i.priceFinal ?? -Infinity) <= maxFinal);

    // Orden adicional por precio FINAL (post query)
    if (sortParam === 'final') {
      filtered = filtered
        .slice()
        .sort(
          (a, b) =>
            (a.priceFinal ?? Number.POSITIVE_INFINITY) - (b.priceFinal ?? Number.POSITIVE_INFINITY),
        );
    } else if (sortParam === '-final') {
      filtered = filtered
        .slice()
        .sort(
          (a, b) =>
            (b.priceFinal ?? Number.NEGATIVE_INFINITY) - (a.priceFinal ?? Number.NEGATIVE_INFINITY),
        );
    }

    const filteredTotal = filtered.length;
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
        status: statusParam,
        effectiveStatus: effectiveStatus,
        fallbackRaw: usedFallbackRaw,
      },
      items: filtered,
    });
  } catch (err: any) {
    console.error('[public/catalogo] error:', err);
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
