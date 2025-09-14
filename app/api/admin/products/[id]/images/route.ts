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

/* ============================================================
   GET: SIEMPRE listar desde R2 y fusionar con DB si existe
   ============================================================ */
export async function GET(_req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  try {
    const prefix = `products/${productId}/`;

    // 1) R2 es la fuente de verdad
    const r2Objs = await r2List(prefix); // [{ key, size, uploaded, etag }]
    const r2Map = new Map(r2Objs.map(o => [o.key, o] as const));

    // 2) Traer metadata desde DB (si la tabla existe)
    let rows: any[] = [];
    try {
      rows =
        (await (prisma as any)?.productImage?.findMany({
          where: { productId },
          select: {
            id: true,
            key: true,
            alt: true,
            isCover: true,
            sortOrder: true,
            size: true,
            width: true,
            height: true,
            createdAt: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })) ?? [];
    } catch {
      rows = [];
    }

    // 3) Fusionar por key (R2 + DB)
    const items = r2Objs.map((o, i) => {
      const row = rows.find(r => r.key === o.key);
      return {
        id: row?.id,
        key: o.key,
        url: publicR2Url(o.key),
        alt: row?.alt ?? null,
        isCover: row?.isCover ?? (i === 0),
        sortOrder: Number.isFinite(row?.sortOrder) ? row!.sortOrder : i, // fallback estable
        size: o.size ?? row?.size ?? null,
        width: row?.width ?? null,
        height: row?.height ?? null,
        createdAt: row?.createdAt ?? o.uploaded ?? null,
      };
    });

    // 4) (Opcional) incluir filas de DB que no están en R2
    for (const r of rows) {
      if (r?.key && !r2Map.has(r.key)) {
        items.push({
          id: r.id,
          key: r.key,
          url: publicR2Url(r.key),
          alt: r.alt ?? null,
          isCover: !!r.isCover,
          sortOrder: Number.isFinite(r.sortOrder) ? r.sortOrder : null,
          size: r.size ?? null,
          width: r.width ?? null,
          height: r.height ?? null,
          createdAt: r.createdAt ?? null,
        });
      }
    }

    // 5) Orden final por sortOrder (asc) y fallback a createdAt
    items.sort((a: any, b: any) => {
      const soA = Number.isFinite(a.sortOrder) ? a.sortOrder : 999999;
      const soB = Number.isFinite(b.sortOrder) ? b.sortOrder : 999999;
      if (soA !== soB) return soA - soB;
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tA - tB;
    });

    const res = NextResponse.json({ ok: true, items, images: items });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

/* ============================================================
   POST: subir a R2 y (best-effort) crear registro en DB
   ============================================================ */
export async function POST(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'bad_request: expected multipart/form-data' },
      { status: 400 },
    );
  }

  const file = form.get('file') as File | null;
  const alt = (String(form.get('alt') ?? '').trim() || null) as string | null;

  if (!file || typeof (file as any).arrayBuffer !== 'function') {
    return NextResponse.json({ ok: false, error: 'bad_request: field "file" required' }, { status: 400 });
  }

  try {
    // sortOrder: si no viene, lo dejamos al final (0-based). Si DB falla, no pasa nada.
    let sortOrder = Number(form.get('sortOrder'));
    if (!Number.isFinite(sortOrder)) {
      try {
        sortOrder = (await (prisma as any)?.productImage?.count({ where: { productId } })) ?? 0;
      } catch {
        sortOrder = 0;
      }
    }
    const isFirst = sortOrder === 0;

    // Subida a R2
    const safeName = sanitizeName((file as any).name || 'upload');
    const key = `products/${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;
    const contentType = (file as any).type || undefined;

    try {
      await r2Put(key, file, contentType);
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, error: 'r2_put_failed', detail: e?.message ?? String(e) },
        { status: 500 },
      );
    }

    // Crear en DB (best effort)
    let created: any = {
      id: undefined,
      key,
      alt,
      sortOrder,
      isCover: isFirst,
      createdAt: new Date().toISOString(),
    };
    try {
      created = await (prisma as any)?.productImage?.create({
        data: {
          productId,
          key,
          alt,
          sortOrder,
          isCover: isFirst ? true : undefined,
          size: typeof (file as any).size === 'number' ? (file as any).size : undefined,
        },
        select: { id: true, key: true, alt: true, sortOrder: true, isCover: true, createdAt: true },
      });
    } catch {
      // Si Prisma falla en Edge, seguimos igual: la imagen ya está en R2
    }

    await audit(req, 'product_images.create', 'product', String(productId), {
      imageId: created?.id,
      key,
    }).catch(() => {});

    return NextResponse.json(
      { ok: true, item: { ...created, url: publicR2Url(key) } },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

/* ============================================================
   DELETE: soporta body JSON { imageId?, key? } o query ?imageId / ?key
   ============================================================ */
export async function DELETE(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  const url = new URL(req.url);
  const qsImageId = url.searchParams.get('imageId');
  const qsKey = url.searchParams.get('key');

  const body = (await req.json().catch(() => ({}))) as { imageId?: number; key?: string };
  const imageId =
    typeof body.imageId === 'number' ? body.imageId : qsImageId ? Number(qsImageId) : undefined;
  const key = typeof body.key === 'string' ? body.key : typeof qsKey === 'string' ? qsKey : undefined;

  if (!imageId && !key) {
    return NextResponse.json({ ok: false, error: 'missing imageId or key' }, { status: 400 });
  }

  try {
    let keyToDelete: string | null = null;

    // Si llega imageId, buscamos el key y borramos el registro
    if (imageId) {
      try {
        const img = await (prisma as any)?.productImage?.findFirst({
          where: { id: imageId, productId },
          select: { key: true },
        });
        if (img?.key) keyToDelete = img.key;

        await (prisma as any)?.productImage?.deleteMany({ where: { id: imageId, productId } });
      } catch {}
    }

    // Si no tenemos key y vino key directo, validamos prefijo y lo usamos
    if (!keyToDelete && key) {
      const expectedPrefix = `products/${productId}/`;
      if (!key.startsWith(expectedPrefix)) {
        return NextResponse.json({ ok: false, error: 'invalid key' }, { status: 400 });
      }
      try {
        await (prisma as any)?.productImage?.deleteMany({ where: { key, productId } });
      } catch {}
      keyToDelete = key;
    }

    // Borrar en R2
    if (keyToDelete) {
      try {
        await r2Delete(keyToDelete);
      } catch {}
    }

    await audit(req, 'product_images.delete', 'product', String(productId), {
      imageId,
      key: keyToDelete ?? key,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
