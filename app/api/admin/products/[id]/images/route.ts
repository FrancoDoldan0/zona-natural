// app/api/admin/products/[id]/images/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { publicR2Url, r2List, r2Delete } from '@/lib/storage';
import { prisma } from '@/lib/prisma-edge';

/**
 * GET /api/admin/products/:id/images
 * Respuesta:
 * {
 *   ok: true,
 *   items: [{ id?, key, url, alt?, isCover?, sortOrder?, size?, width?, height?, createdAt? }],
 *   images: [...] // alias para compatibilidad
 * }
 */
export async function GET(_req: Request, ctx: any) {
  const idStr = ctx?.params?.id;
  const idNum = Number(idStr);
  if (!idNum) {
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

    // 1) Intentar leer desde DB (si existe ProductImage)
    try {
      const rows =
        (await (prisma as any)?.productImage?.findMany({
          where: { productId: idNum },
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
      // Si la tabla no existe o Prisma falla en Edge, seguimos al fallback
      items = null;
    }

    // 2) Fallback a listar directo en R2
    if (!items) {
      const prefix = `products/${idNum}/`;
      const list = await r2List(prefix);
      items = list.map((o, i) => ({
        key: o.key,
        url: publicR2Url(o.key),
        size: o.size ?? null,
        isCover: i === 0,
        sortOrder: i + 1,
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
 * DELETE /api/admin/products/:id/images
 * Body:
 *   { imageId?: number, key?: string }
 * - Si viene imageId: se borra en DB (si existe) y se obtiene el key.
 * - Si no hay DB o no hay imageId, se acepta `key` (validado por prefijo).
 */
export async function DELETE(req: Request, ctx: any) {
  const idStr = ctx?.params?.id;
  const idNum = Number(idStr);
  if (!idNum) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
    }

  const body = (await req.json().catch(() => ({}))) as {
    imageId?: number;
    key?: string;
  };

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
          where: { id: imageId, productId: idNum },
          select: { key: true },
        });

        if (img?.key) keyToDelete = img.key;

        await (prisma as any)?.productImage?.deleteMany({
          where: { id: imageId, productId: idNum },
        });
      } catch {
        // Si no hay tabla o falla Prisma, seguimos
      }
    }

    // 2) Si no obtuvimos key desde DB y vino `key`, validarlo y usarlo
    if (!keyToDelete && key) {
      const expectedPrefix = `products/${idNum}/`;
      if (!key.startsWith(expectedPrefix)) {
        return NextResponse.json({ ok: false, error: 'invalid key' }, { status: 400 });
      }

      // Borrar posible registro en DB si existiera
      try {
        await (prisma as any)?.productImage?.deleteMany({
          where: { key, productId: idNum },
        });
      } catch {
        // Ignorar errores de DB aquí
      }

      keyToDelete = key;
    }

    // 3) Borrar en R2
    if (keyToDelete) {
      try {
        await r2Delete(keyToDelete);
      } catch {
        // No bloquear por error de R2
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
