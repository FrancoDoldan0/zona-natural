// app/api/admin/products/[id]/images/[imageId]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma-edge';
import { r2Delete, publicR2Url } from '@/lib/storage';

/**
 * PATCH /api/admin/products/:id/images/:imageId
 * Body: { alt?: string, isCover?: boolean }
 * - Si isCover === true => pone esta imagen como portada (apaga las demás).
 * - alt se puede setear a string (vacío = '') o null si querés limpiar (enviar alt: null).
 */
export async function PATCH(req: Request, ctx: any) {
  const productId = Number(ctx?.params?.id);
  const imageId = Number(ctx?.params?.imageId);

  if (!productId || !imageId) {
    return NextResponse.json({ ok: false, error: 'missing params' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    alt?: string | null;
    isCover?: boolean;
  };

  if (!('alt' in body) && typeof body.isCover === 'undefined') {
    return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
  }

  try {
    // Marcar como portada
    if (body.isCover === true) {
      try {
        await (prisma as any).$transaction([
          (prisma as any).productImage.updateMany({
            where: { productId },
            data: { isCover: false },
          }),
          (prisma as any).productImage.updateMany({
            where: { id: imageId, productId },
            data: { isCover: true },
          }),
        ]);
      } catch {
        return NextResponse.json(
          { ok: false, error: 'db_unavailable_for_isCover' },
          { status: 501 }
        );
      }
    } else if (body.isCover === false) {
      try {
        await (prisma as any).productImage.updateMany({
          where: { id: imageId, productId },
          data: { isCover: false },
        });
      } catch {
        // no crítico
      }
    }

    // Actualizar alt si vino en el body (incluye null o '')
    if ('alt' in body) {
      try {
        await (prisma as any).productImage.updateMany({
          where: { id: imageId, productId },
          data: { alt: body.alt as any },
        });
      } catch {
        return NextResponse.json(
          { ok: false, error: 'db_unavailable_for_alt' },
          { status: 501 }
        );
      }
    }

    // Intentar devolver el registro actualizado (si hay DB)
    try {
      const row = await (prisma as any).productImage.findFirst({
        where: { id: imageId, productId },
      });

      if (row) {
        return NextResponse.json({
          ok: true,
          item: {
            id: row.id,
            key: row.key,
            url: publicR2Url(row.key),
            alt: row.alt,
            isCover: row.isCover,
            sortOrder: row.sortOrder,
            size: row.size ?? null,
            width: row.width ?? null,
            height: row.height ?? null,
            createdAt: row.createdAt,
          },
        });
      }
    } catch {
      // si no podemos leer, igual devolvemos ok:true
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/:id/images/:imageId
 * - Borra el registro en DB y el objeto en R2.
 * - Requiere DB para resolver el key desde imageId.
 */
export async function DELETE(_req: Request, ctx: any) {
  const productId = Number(ctx?.params?.id);
  const imageId = Number(ctx?.params?.imageId);

  if (!productId || !imageId) {
    return NextResponse.json({ ok: false, error: 'missing params' }, { status: 400 });
  }

  try {
    let key: string | null = null;

    try {
      const img = await (prisma as any).productImage.findFirst({
        where: { id: imageId, productId },
        select: { key: true },
      });
      key = img?.key ?? null;

      await (prisma as any).productImage.deleteMany({
        where: { id: imageId, productId },
      });
    } catch {
      return NextResponse.json(
        { ok: false, error: 'db_unavailable_for_delete' },
        { status: 501 }
      );
    }

    if (key) {
      try {
        await r2Delete(key);
      } catch {
        // si R2 falla no bloqueamos
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
