// app/api/admin/products/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { slugify } from '@/lib/slug';
import { audit } from '@/lib/audit';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

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

function normalizeImage(row: any) {
  const keyOrUrl: string | undefined = row?.key ?? row?.url ?? undefined;
  let url = '';
  if (typeof keyOrUrl === 'string') {
    url =
      keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/')
        ? keyOrUrl
        : publicR2Url(keyOrUrl);
  }
  return {
    id: row?.id,
    url,
    alt: row?.alt ?? null,
    isCover: !!row?.isCover,
    sortOrder: row?.sortOrder ?? null,
    size: row?.size ?? null,
    width: row?.width ?? null,
    height: row?.height ?? null,
    createdAt: row?.createdAt ?? null,
    key: row?.key ?? undefined,
  };
}

// GET /api/admin/products/:id
export async function GET(_req: Request, ctx: any) {
  const idNum = Number(ctx?.params?.id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  const item = await prisma.product.findUnique({
    where: { id: idNum },
    include: {
      category: true,
      subcategory: true,
      images: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
    },
  });

  if (!item) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const normalized = {
    ...item,
    images: (item.images ?? []).map(normalizeImage),
  };

  const res = NextResponse.json({ ok: true, item: normalized });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

// PUT /api/admin/products/:id
export async function PUT(req: Request, ctx: any) {
  try {
    const idNum = Number(ctx?.params?.id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
    }

    const json = await req.json<any>();
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
    if (!data.slug && 'name' in b && b.name) data.slug = slugify(b.name);
    if ('description' in b) data.description = b.description ?? null;
    if ('price' in b) data.price = b.price ?? null;
    if ('sku' in b) data.sku = b.sku || '' || null;
    if ('status' in b) data.status = b.status!;
    if ('categoryId' in b) data.categoryId = b.categoryId ?? null;
    if ('subcategoryId' in b) data.subcategoryId = b.subcategoryId ?? null;

    const updated = await prisma.product.update({ where: { id: idNum }, data });
    await audit(req, 'UPDATE', 'product', String(idNum), b);

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
export async function DELETE(req: Request, ctx: any) {
  try {
    const idNum = Number(ctx?.params?.id);
    if (!Number.isFinite(idNum)) {
      return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
    }

    const imgCount =
      (await prisma.productImage.count({ where: { productId: idNum } }).catch(() => 0)) ?? 0;

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

    await prisma.product.delete({ where: { id: idNum } });
    await audit(req, 'DELETE', 'product', String(idNum));

    return NextResponse.json({ ok: true, id: idNum, deleted: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
