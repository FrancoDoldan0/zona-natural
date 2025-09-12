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
 *   // alias para compatibilidad con código viejo:
 *   images: [...]
 * }
 */
export async function GET(_req: Request, { params }: { params: { id?: string } }) {
  const idNum = Number(params?.id || 0);
  if (!idNum) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  try {
    // 1) Intentar desde DB (si usás ProductImage)
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

    try {
      const rows = await prisma.productImage.findMany({
        where: { productId: idNum },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      });

      if (rows.length > 0) {
        items = rows.map((r) => ({
          id: r.id,
          key: r.key,
          url: publicR2Url(r.key),
          alt: r.alt,
          isCover: r.isCover,
          sortOrder: r.sortOrder,
          size: (r as any).size ?? null,
          width: (r as any).width ?? null,
          height: (r as any).height ?? null,
          createdAt: r.createdAt,
        }));
      }
    } catch {
      // Si la tabla no existe o falla Prisma en Edge, seguimos con fallback.
      items = null;
    }

    // 2) Fallback a listar directo en R2 si no hay filas en DB
    if (!items) {
      const prefix = `products/${idNum}/`;
      const list = await r2List(prefix);
      items = list.map((o, i) => ({
        key: o.key,
        url: publicR2Url(o.key),
        size: o.size,
        // valores razonables para UI si no hay DB:
        isCover: i === 0,
        sortOrder: i + 1,
      }));
    }

    const res = NextResponse.json({ ok: true, items, images: items });
    // Evitar cache en el borde
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/:id/images
 * Body JSON:
 *   - imageId?: number  (recomendado)
 *   - key?: string      (alternativa; se valida que pertenezca a products/:id/)
 */
export async function DELETE(req: Request, { params }: { params: { id?: string } }) {
  const idNum = Number(params?.id || 0);
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

    // 1) Si viene imageId, intentamos borrar registro y obtener key desde DB
    if (imageId) {
      try {
        const img = await prisma.productImage.findFirst({
          where: { id: imageId, productId: idNum },
          select: { key: true },
        });

        if (img?.key) {
          keyToDelete = img.key;
        }

        await prisma.productImage.deleteMany({
          where: { id: imageId, productId: idNum },
        });
      } catch {
        // Si la tabla no existe o falla Prisma, seguimos con lo que tengamos.
      }
    }

    // 2) Si no obtuvimos key desde DB y vino por body, lo usamos (validado)
    if (!keyToDelete && key) {
      const expectedPrefix = `products/${idNum}/`;
      if (!key.startsWith(expectedPrefix)) {
        return NextResponse.json({ ok: false, error: 'invalid key' }, { status: 400 });
      }

      // Borrar potencial registro en DB si existiera
      try {
        await prisma.productImage.deleteMany({
          where: { key, productId: idNum },
        });
      } catch {
        // Ignorar errores de DB en este punto
      }

      keyToDelete = key;
    }

    // 3) Borrar en R2 (si tenemos key)
    if (keyToDelete) {
      try {
        await r2Delete(keyToDelete);
      } catch {
        // Si falla borrar en R2, devolvemos ok igualmente (para no trabar la UI).
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
