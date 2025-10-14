export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

// ✅ incluye AGOTADO
const VariantSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  label: z.string().min(1),
  price: z.coerce.number().optional().nullable(),
  priceOriginal: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  stock: z.coerce.number().int().optional().nullable(),
  sortOrder: z.coerce.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'AGOTADO']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),

  // 🆕 variantes
  hasVariants: z.boolean().optional().default(false),
  variants: z.array(VariantSchema).max(3).optional(),
});

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().optional(), // "" => recalcular
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'AGOTADO']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),

  // 🆕 variantes
  hasVariants: z.boolean().optional(),
  variants: z.array(VariantSchema).max(3).optional(),
});

const STATUS_VALUES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'AGOTADO'] as const);

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET,POST,PUT,OPTIONS',
      'Cache-Control': 'no-store',
    },
  });
}

// ────────────────────────────────────────────────────────────────────────────
// GET
// ────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const url = new URL(req.url);

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
        // 🆕 variantes para el editor
        hasVariants: true,
        variants: {
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
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!item) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, item }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const q = (url.searchParams.get('q') || '').trim();
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

// ────────────────────────────────────────────────────────────────────────────
// POST — pre-check de slug + prevalidaciones de FK + errores informativos
// ────────────────────────────────────────────────────────────────────────────
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

    // Slug/estado
    const newSlug = (b.slug?.trim() || slugify(b.name)).trim();
    const sku = (b.sku ?? '').trim();
    const safeStatus = STATUS_VALUES.has((b.status || 'ACTIVE') as any)
      ? (b.status as any)
      : 'ACTIVE';

    // ✅ Chequeo de slug único para evitar 500 por unique en CF/Edge
    const exists = await prisma.product.findUnique({
      where: { slug: newSlug },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: 'slug_taken', slug: newSlug },
        { status: 409 },
      );
    }

    // ── Prevalidaciones de FK
    let categoryId: number | null = b.categoryId ?? null;
    let subcategoryId: number | null = b.subcategoryId ?? null;

    if (categoryId != null) {
      const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json(
          { ok: false, error: 'category_not_found', detail: { categoryId } },
          { status: 400 },
        );
      }
    }

    if (subcategoryId != null) {
      const sub = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        select: { id: true, categoryId: true },
      });
      if (!sub) {
        return NextResponse.json(
          { ok: false, error: 'subcategory_not_found', detail: { subcategoryId } },
          { status: 400 },
        );
      }
      if (categoryId != null && sub.categoryId !== categoryId) {
        return NextResponse.json(
          {
            ok: false,
            error: 'subcategory_mismatch',
            detail: {
              subcategoryId,
              categoryIdProvided: categoryId,
              categoryIdOfSub: sub.categoryId,
            },
          },
          { status: 400 },
        );
      }
      if (categoryId == null) categoryId = sub.categoryId;
    }

    // Inserción (creamos variantes anidadas si corresponde)
    const created = await prisma.product.create({
      data: {
        name: b.name,
        slug: newSlug,
        description: b.description ?? null,
        price: b.price ?? null,
        sku: sku === '' ? null : sku,
        status: safeStatus,
        categoryId,
        subcategoryId,
        hasVariants: !!b.hasVariants && Array.isArray(b.variants) && b.variants.length > 0,
        variants:
          !!b.hasVariants && Array.isArray(b.variants) && b.variants.length > 0
            ? {
                create: b.variants
                  .slice(0, 3)
                  .map((v, i) => ({
                    label: v.label,
                    price: v.price ?? null,
                    priceOriginal: v.priceOriginal ?? null,
                    sku: (v.sku ?? '') || null,
                    stock: v.stock ?? null,
                    sortOrder: Number.isFinite(v.sortOrder as any) ? (v.sortOrder as number) : i,
                    active: v.active ?? true,
                  })),
              }
            : undefined,
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
        hasVariants: true,
        variants: {
          select: {
            id: true, label: true, price: true, priceOriginal: true, sku: true, stock: true, sortOrder: true, active: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    try {
      await audit(req, 'CREATE', 'Product', created.id, { name: b.name, slug: newSlug });
    } catch {}

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    const code = e?.code as string | undefined;
    if (code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'unique_constraint', field: e?.meta?.target ?? 'slug' },
        { status: 409 },
      );
    }
    if (code === 'P2003') {
      return NextResponse.json(
        { ok: false, error: 'foreign_key_violation', detail: e?.meta ?? null },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'create_failed',
        code: e?.code ?? null,
        meta: e?.meta ?? null,
        detail: e?.message ?? String(e),
      },
      { status: 500 },
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT
// ────────────────────────────────────────────────────────────────────────────
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
      data.status = b.status;
    }

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

    // ── Actualizar producto base
    const baseItem = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(typeof b.hasVariants === 'boolean' ? { hasVariants: b.hasVariants } : {}),
      },
      select: { id: true },
    });

    // ── Upsert de variantes (máx 3) cuando se envía hasVariants/variants
    if (typeof b.hasVariants === 'boolean') {
      if (!b.hasVariants) {
        // Apagado: borramos todas las variantes
        await prisma.productVariant.deleteMany({ where: { productId: id } });
      } else if (Array.isArray(b.variants)) {
        const list = b.variants.slice(0, 3);
        const keepIds = list.filter((v) => !!v.id).map((v) => v.id!) as number[];

        // Crear o actualizar uno a uno (evitamos nested upsert para mantener compatibilidad en Edge)
        for (let i = 0; i < list.length; i++) {
          const v = list[i];
          const patch = {
            label: v.label,
            price: v.price ?? null,
            priceOriginal: v.priceOriginal ?? null,
            sku: (v.sku ?? '') || null,
            stock: v.stock ?? null,
            sortOrder: Number.isFinite(v.sortOrder as any) ? (v.sortOrder as number) : i,
            active: v.active ?? true,
          };
          if (v.id) {
            await prisma.productVariant.update({ where: { id: v.id }, data: patch });
          } else {
            await prisma.productVariant.create({ data: { ...patch, productId: id } });
          }
        }

        // Eliminar las que no vinieron
        await prisma.productVariant.deleteMany({
          where: keepIds.length ? { productId: id, id: { notIn: keepIds } } : { productId: id },
        });
      }
    }

    // Devolver item completo (incluyendo variantes)
    const item = await prisma.product.findUnique({
      where: { id: baseItem.id },
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
        hasVariants: true,
        variants: {
          select: {
            id: true, label: true, price: true, priceOriginal: true, sku: true, stock: true, sortOrder: true, active: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    try {
      await audit(req, 'UPDATE', 'Product', id, { ...data, hasVariants: b.hasVariants ?? undefined });
    } catch {}

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
