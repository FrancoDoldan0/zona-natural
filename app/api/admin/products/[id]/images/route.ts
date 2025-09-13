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

function normalizeDbImage(r: any) {
  const keyOrUrl: string | undefined = r?.key ?? r?.url ?? undefined;
  let url = '';
  if (typeof keyOrUrl === 'string') {
    url =
      keyOrUrl.startsWith('http') || keyOrUrl.startsWith('/')
        ? keyOrUrl
        : publicR2Url(keyOrUrl);
  }
  return {
    id: r?.id,
    key: r?.key,
    url,
    alt: r?.alt ?? null,
    isCover: !!r?.isCover,
    sortOrder: r?.sortOrder ?? null,
    size: r?.size ?? null,
    width: r?.width ?? null,
    height: r?.height ?? null,
    createdAt: r?.createdAt ?? null,
  };
}

/* ---------- GET: listar imágenes ---------- */
export async function GET(_req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  try {
    let items:
      | Array<{
          id?: number;
          key?: string;
          url: string;
          alt?: string | null;
          isCover?: boolean;
          sortOrder?: number | null;
          size?: number | null;
          width?: number | null;
          height?: number | null;
          createdAt?: string | Date | null;
        }>
      | null = null;

    // 1) DB
    try {
      const rows =
        (await (prisma as any)?.productImage?.findMany({
          where: { productId },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        })) ?? [];
      if (rows.length > 0) items = rows.map(normalizeDbImage);
    } catch {
      items = null;
    }

    // 2) Fallback a R2
    if (!items) {
      const prefix = `products/${productId}/`;
      const list = await r2List(prefix);
      items = list.map((o, i) => ({
        key: o.key,
        url: publicR2Url(o.key),
        size: o.size ?? null,
        isCover: i === 0,
        sortOrder: i, // 0-based
      }));
    }

    const res = NextResponse.json({ ok: true, items, images: items });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: `internal_error: ${e?.message ?? String(e)}` },
      { status: 500 },
    );
  }
}

/* ---------- POST: subir una imagen ---------- */
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
    // sortOrder al final (0-based) si no viene
    let sortOrder = Number(form.get('sortOrder'));
    if (!Number.isFinite(sortOrder)) {
      sortOrder =
        ((await (prisma as any)?.productImage
          ?.count({ where: { productId } })
          .catch(() => 0)) ?? 0);
    }
    const isFirst = sortOrder === 0;

    // key y subida a R2
    const safeName = sanitizeName((file as any).name || 'upload');
    const key = `products/${productId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeName}`;
    const contentType = (file as any).type || undefined;

    try {
      await r2Put(key, file, contentType);
    } catch (e: any) {
      // Si el binding R2 no existe o falla la subida, lo verás acá
      return NextResponse.json(
        { ok: false, error: `r2_put_failed: ${e?.message ?? String(e)}` },
        { status: 500 },
      );
    }

    // crear en DB (best effort)
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
      // ignoramos si no hay tabla en edge
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
      { ok: false, error: `internal_error: ${e?.message ?? String(e)}` },
      { status: 500 },
    );
  }
}

/* ---------- DELETE: borrar imagen ---------- */
export async function DELETE(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'missing product id' }, { status: 400 });
  }

  // Soportamos query (?imageId / ?key) y body
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

    if (imageId) {
      try {
        const img = await (prisma as any)?.productImage?.findFirst({
          where: { id: imageId, productId },
          select: { key: true },
        });
        if (img?.key) keyToDelete = img.key;

        await (prisma as any)?.productImage?.deleteMany({
          where: { id: imageId, productId },
        });
      } catch {}
    }

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
      { ok: false, error: `internal_error: ${e?.message ?? String(e)}` },
      { status: 500 },
    );
  }
}
