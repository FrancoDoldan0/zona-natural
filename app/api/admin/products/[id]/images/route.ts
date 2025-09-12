// app/api/admin/products/[id]/images/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { publicR2Url, r2List, r2Delete, r2Put } from '@/lib/storage';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

/* ---------- helpers ---------- */
async function readParams(ctx: any): Promise<{ productId: number | null }> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const n = Number(obj?.id);
  return { productId: Number.isFinite(n) ? n : null };
}

function sanitizeName(name: string): string {
  return (name || 'upload').replace(/[^\w.\-]+/g, '_');
}

/**
 * GET /api/admin/products/:id/images
 * Respuesta:
 * { ok: true, items: [{ id?, key, url, alt?, isCover?, sortOrder?, size?, width?, height?, createdAt? }], images: [...] }
 */
export async function GET(_req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  try {
    let items:
      | Array<{
          id?: number;
          key: string;
          url: string;
          alt?: string | null;
          isCover?: boolean;
          sortOrder?: number | null;
          size?: number | null;
          width?: number | null;
          height?: number | null;
          createdAt?: string | Date;
        }>
      | null = null;

    // 1) Intentar leer desde DB
    try {
      const rows =
        (await (prisma as any)?.productImage?.findMany({
          where: { productId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })) ?? [];

      if (rows.length > 0) {
        items = rows.map((r: any) => ({
          id: r.id,
          key: r.key,
          url: publicR2Url(r.key),
          alt: r.alt,
          isCover: r.isCover,
          sortOrder: r.sortOrder,
          size: r.size ?? null,
          width: r.width ?? null,
          height: r.height ?? null,
          createdAt: r.createdAt,
        }));
      }
    } catch {
      items = null; // fallback a R2
    }

    // 2) Fallback: listar directo en R2
    if (!items) {
      const prefix = `products/${productId}/`;
      const list = await r2List(prefix);
      items = list.map((o, i) => ({
        key: o.key,
        url: publicR2Url(o.key),
        size: o.size ?? null,
        isCover: i === 0,
        sortOrder: i, // 0-based para ser consistente con reorder
      }));
    }

    const res = NextResponse.json({ ok: true, items, images: items });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products/:id/images
 * multipart/form-data: file, alt?
 * - Sube a R2 y crea registro en DB (key, alt, sortOrder, isCover si es la primera).
 */
export async function POST(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Se esperaba multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file') as File | null;
  const alt = (String(form.get('alt') ?? '').trim() || null) as string | null;

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ ok: false, error: 'Campo "file" requerido' }, { status: 400 });
  }

  try {
    // sortOrder al final (0-based)
    const existingCount =
      (await (prisma as any)?.productImage?.count({ where: { productId } }).catch(() => 0)) ?? 0;

    // armar key y subir a R2
    const safeName = sanitizeName(file.name || 'upload');
    const key = `products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const contentType = file.type || undefined;
    await r2Put(key, file, contentType);

    // crear registro en DB (guardamos key)
    let created: any = { id: undefined, key, alt, sortOrder: existingCount, isCover: existingCount === 0 };
    try {
      created = await (prisma as any)?.productImage?.create({
        data: {
          productId,
          key,
          alt,
          sortOrder: existingCount,
          isCover: existingCount === 0 ? true : undefined,
          size: typeof file.size === 'number' ? file.size : undefined,
        },
        select: { id: true, key: true, alt: true, sortOrder: true, isCover: true, createdAt: true },
      });
    } catch {
      // Si no hay tabla o falla Prisma, devolvemos la info mínima
      created = { ...created, createdAt: new Date().toISOString() };
    }

    await audit(req, 'product_images.create', 'product', String(productId), {
      imageId: created?.id,
      key,
    }).catch(() => {});

    return NextResponse.json(
      {
        ok: true,
        item: {
          ...created,
          url: publicR2Url(key),
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/:id/images
 * Body: { imageId?: number, key?: string }
 * - Si viene imageId: borra en DB (si existe) y toma el key.
 * - Si no, acepta key (validado por prefijo) y borra en R2 (+ limpia DB si aplica).
 */
export async function DELETE(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { imageId?: number; key?: string };
  const imageId = typeof body.imageId === 'number' ? body.imageId : undefined;
  const key = typeof body.key === 'string' ? body.key : undefined;

  if (!imageId && !key) {
    return NextResponse.json({ ok: false, error: 'missing imageId or key' }, { status: 400 });
  }

  try {
    let keyToDelete: string | null = null;

    // 1) Si llega imageId, usar DB para obtener key y borrar registro
    if (imageId) {
      try {
        const img = await (prisma as any)?.productImage?.findFirst({
          where: { id: imageId, productId },
          select: { key: true },
        });
        if (img?.key) keyToDelete = img.key;

        await (prisma as any)?.productImage?.deleteMany({ where: { id: imageId, productId } });
      } catch {
        /* ignore DB errors */
      }
    }

    // 2) Si no obtuvimos key y vino `key`, validarlo y usarlo
    if (!keyToDelete && key) {
      const expectedPrefix = `products/${productId}/`;
      if (!key.startsWith(expectedPrefix)) {
        return NextResponse.json({ ok: false, error: 'invalid key' }, { status: 400 });
      }
      try {
        await (prisma as any)?.productImage?.deleteMany({ where: { key, productId } });
      } catch {
        /* ignore DB errors */
      }
      keyToDelete = key;
    }

    // 3) Borrar en R2
    if (keyToDelete) {
      try {
        await r2Delete(keyToDelete);
      } catch {
        /* ignore R2 errors */
      }
    }

    await audit(req, 'product_images.delete', 'product', String(productId), {
      imageId,
      key: keyToDelete ?? key,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
