// app/api/admin/products/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

// ✅ incluye AGOTADO
const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'AGOTADO']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  // slug vacío ("") => recalcular; si no se envía, no se toca
  slug: z.string().optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'AGOTADO']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),
});

// ✅ set de estados válidos (incluye AGOTADO)
const STATUS_VALUES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'AGOTADO'] as const);

// ────────────────────────────────────────────────────────────────────────────
// OPTIONS — útil para preflights/robots raros en CF Pages y dejar claro Allow
// ────────────────────────────────────────────────────────────────────────────
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'GET,POST,PUT,OPTIONS',
      'Cache-Control': 'no-store',
    },
  });
}

// GET /api/admin/products
// - Sin id: listado -> { ok, items, total }
// - Con ?id=: detalle -> { ok, item }
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // --------- Detalle por ?id= ----------
  const idRaw = url.searchParams.get('id');
  if (idRaw && idRaw.trim() !== '') {
    const id = Number(idRaw);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
    }

    const item = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        sku: true,
        status: true,
        categoryId: true,
        subcategoryId: true,
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    });

    if (!item) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, item }, { headers: { 'Cache-Control': 'no-store' } });
  }

  // --------- Listado ----------
  const q = (url.searchParams.get('q') || '').trim();

  // limit/offset (fallback page/perPage)
  const limitRaw = url.searchParams.get('limit');
  const offsetRaw = url.searchParams.get('offset');
  const pageRaw = url.searchParams.get('page');
  const perPageRaw = url.searchParams.get('perPage');

  let take =
    Math.min(100, Math.max(1, parseInt(limitRaw ?? '', 10))) ||
    Math.min(60, Math.max(1, parseInt(perPageRaw ?? '', 10) || 12));
  let skip = parseInt(offsetRaw ?? '', 10);
  if (!Number.isFinite(skip)) {
    const page = Math.max(1, parseInt(pageRaw || '1', 10));
    const perPage = Math.min(60, Math.max(1, parseInt(perPageRaw || '12', 10)));
    take = perPage;
    skip = (page - 1) * perPage;
  }

  const status = (url.searchParams.get('status') || '').toUpperCase();

  // Leer RAW para evitar Number(null)→0
  const categoryIdRaw = url.searchParams.get('categoryId');
  const subcategoryIdRaw = url.searchParams.get('subcategoryId');
  const minPriceRaw = url.searchParams.get('minPrice');
  const maxPriceRaw = url.searchParams.get('maxPrice');

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (STATUS_VALUES.has(status as any)) where.status = status as any;

  if (categoryIdRaw && categoryIdRaw.trim() !== '') {
    const categoryId = Number(categoryIdRaw);
    if (Number.isFinite(categoryId)) where.categoryId = categoryId;
  }
  if (subcategoryIdRaw && subcategoryIdRaw.trim() !== '') {
    const subcategoryId = Number(subcategoryIdRaw);
    if (Number.isFinite(subcategoryId)) where.subcategoryId = subcategoryId;
  }
  if ((minPriceRaw && minPriceRaw.trim() !== '') || (maxPriceRaw && maxPriceRaw.trim() !== '')) {
    where.price = {};
    if (minPriceRaw && minPriceRaw.trim() !== '') {
      const minPrice = Number(minPriceRaw);
      if (Number.isFinite(minPrice)) where.price.gte = minPrice;
    }
    if (maxPriceRaw && maxPriceRaw.trim() !== '') {
      const maxPrice = Number(maxPriceRaw);
      if (Number.isFinite(maxPrice)) where.price.lte = maxPrice;
    }
  }

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        sku: true,
        status: true,
        categoryId: true,
        subcategoryId: true,
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json(
    { ok: true, items, total },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  try {
    const json = await req.json<any>();
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', detail: parsed.error.format() },
        { status: 400 },
      );
    }
    const b = parsed.data;

    const newSlug = (b.slug?.trim() || slugify(b.name)).trim();
    const sku = (b.sku ?? '').trim();
    const safeStatus = STATUS_VALUES.has((b.status || 'ACTIVE') as any)
      ? (b.status as any)
      : 'ACTIVE';

    const created = await prisma.product.create({
      data: {
        name: b.name,
        slug: newSlug,
        description: b.description ?? null,
        price: b.price ?? null,
        sku: sku === '' ? null : sku,
        status: safeStatus, // ✅ puede ser AGOTADO
        categoryId: b.categoryId ?? null,
        subcategoryId: b.subcategoryId ?? null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        sku: true,
        status: true,
        categoryId: true,
        subcategoryId: true,
      },
    });

    await audit(req, 'CREATE', 'Product', created.id, { name: b.name, slug: newSlug });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'unique_constraint', field: 'slug' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'create_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

// PUT /api/admin/products?id=123
export async function PUT(req: NextRequest) {
  const url = new URL(req.url);
  const idRaw = url.searchParams.get('id');
  if (!idRaw || idRaw.trim() === '') {
    return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });
  }
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', detail: parsed.error.format() },
        { status: 400 },
      );
    }
    const b = parsed.data;

    const data: any = {};
    if ('name' in b) data.name = b.name;
    if ('description' in b) data.description = b.description ?? null;
    if ('price' in b) data.price = b.price ?? null;
    if ('sku' in b) data.sku = (b.sku ?? '') === '' ? null : b.sku;
    if ('categoryId' in b) data.categoryId = b.categoryId ?? null;
    if ('subcategoryId' in b) data.subcategoryId = b.subcategoryId ?? null;
    if ('status' in b && typeof b.status === 'string' && STATUS_VALUES.has(b.status as any)) {
      data.status = b.status; // ✅ admite AGOTADO
    }

    // Slug: vacío => recalcular con (b.name || actual)
    if ('slug' in b && typeof b.slug === 'string') {
      const s = b.slug.trim();
      if (s === '') {
        const current = await prisma.product.findUnique({ where: { id }, select: { name: true } });
        const base = (b.name ?? current?.name ?? '').trim();
        data.slug = slugify(base || `product-${id}`);
      } else {
        data.slug = s;
      }
    }

    const item = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        sku: true,
        status: true,
        categoryId: true,
        subcategoryId: true,
      },
    });

    await audit(req, 'UPDATE', 'Product', id, data);

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'unique_constraint', field: 'slug' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'update_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
