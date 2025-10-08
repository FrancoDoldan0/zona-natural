// app/api/admin/products/[id]/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';
import { r2List, r2Delete } from '@/lib/storage'; // 👈 limpiar objetos en R2

const prisma = createPrisma();

// Estados permitidos (incluye AGOTADO)
const STATUS_VALUES = new Set(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED', 'AGOTADO'] as const);

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

function getIdFromUrl(req: NextRequest): number | null {
  const { pathname } = new URL(req.url);
  const m = pathname.match(/\/api\/admin\/products\/(\d+)(?:\/)?$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

// GET /api/admin/products/:id -> { ok, item }
export async function GET(req: NextRequest) {
  const id = getIdFromUrl(req);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });

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
  return NextResponse.json({ ok: true, item });
}

// PUT /api/admin/products/:id -> { ok, item }
export async function PUT(req: NextRequest) {
  const id = getIdFromUrl(req);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });

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

    // slug: "" => recalcular; string no vacío => setear; no enviado => no tocar
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

    await audit(req, 'UPDATE', 'Product', id, data).catch(() => {});
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

// DELETE /api/admin/products/:id -> { ok }
export async function DELETE(req: NextRequest) {
  const id = getIdFromUrl(req);
  if (!id) return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });

  try {
    // 1) (best-effort) Limpiar imágenes en R2 bajo products/{id}/
    try {
      const prefix = `products/${id}/`;
      const objs = await r2List(prefix);
      await Promise.allSettled(objs.map((o) => r2Delete(o.key)));
    } catch {
      // no bloqueamos el delete si falla R2
    }

    // 2) Desasociar ofertas del producto
    await prisma.offer.updateMany({
      where: { productId: id },
      data: { productId: null },
    });

    // 3) Borrar tags del producto (tabla puente)
    await prisma.productTag.deleteMany({
      where: { productId: id },
    });

    // 4) (best-effort) Borrar filas de imágenes si tu DB no tiene cascade
    try {
      await prisma.productImage.deleteMany({
        where: { productId: id },
      });
    } catch {
      // si la relación ya está en cascade o el modelo difiere, ignoramos
    }

    // 5) Borrar el producto
    await prisma.product.delete({ where: { id } });

    await audit(req, 'DELETE', 'Product', id, null).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2003') {
      // violación de FK (por si quedó alguna relación)
      return NextResponse.json(
        { ok: false, error: 'delete_failed', detail: 'constraint_violation' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
