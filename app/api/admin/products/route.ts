// app/api/admin/products/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),
});

const STATUS_VALUES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE'] as const);

// GET /api/admin/products
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const q = (url.searchParams.get('q') || '').trim();

  // Soporta limit/offset y también page/perPage como fallback
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

  // ⚠️ IMPORTANTE: leer los valores RAW primero para no hacer Number(null) → 0
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

  return NextResponse.json({ ok: true, items, total });
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
        status: safeStatus,
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
