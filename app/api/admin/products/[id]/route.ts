export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),
});

// GET /api/admin/products/:id
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const item = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      subcategory: true,
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!item) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

// PUT /api/admin/products/:id
export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = Number(ctx.params.id);
    const json = await req.json();
    const parsed = UpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', detail: parsed.error.format() },
        { status: 400 },
      );
    }

    const b = parsed.data;
    const data: any = {};
    if ('name' in b) data.name = b.name!;
    if ('slug' in b) data.slug = (b.slug && b.slug.trim()) || undefined;
    if (!data.slug && 'name' in b && b.name) data.slug = slugify(b.name); // fallback
    if ('description' in b) data.description = b.description ?? null;
    if ('price' in b) data.price = b.price ?? null;
    if ('sku' in b) data.sku = b.sku || '' || null;
    if ('status' in b) data.status = b.status!;
    if ('categoryId' in b) data.categoryId = b.categoryId ?? null;
    if ('subcategoryId' in b) data.subcategoryId = b.subcategoryId ?? null;

    const updated = await prisma.product.update({ where: { id }, data });
    await audit(req, 'UPDATE', 'Product', id, b);
    return NextResponse.json({ ok: true, item: updated });
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

// DELETE /api/admin/products/:id
export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const id = Number(ctx.params.id);
    const imgCount = await prisma.productImage.count({ where: { productId: id } });
    if (imgCount > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'has_images',
          detail: `Tiene ${imgCount} imágenes. Eliminá primero las imágenes.`,
        },
        { status: 400 },
      );
    }
    await prisma.product.delete({ where: { id } });
    await audit(req, 'DELETE', 'Product', id);
    return NextResponse.json({ ok: true, id, deleted: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
