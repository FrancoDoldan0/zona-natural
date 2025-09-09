// app/api/admin/products/[id]/images/[imageId]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';
import { deleteUpload } from '@/lib/storage';



import { getEnv } from '@/lib/cf-env';
const prisma = createPrisma();
// -------- utils --------
async function readParams(ctx: any): Promise<{ productId: number | null; imageId: number | null }> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const productId = Number(obj?.id);
  const imageId = Number(obj?.imageId);
  return {
    productId: Number.isFinite(productId) ? productId : null,
    imageId: Number.isFinite(imageId) ? imageId : null,
  };
}

function strOrNull(v: unknown) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}
function numOrNull(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Intenta derivar una clave de R2 a partir de la URL pública.
 * Si configuraste PUBLIC_R2_BASE_URL, y la URL empieza con ese prefijo,
 * devuelve la parte restante como "key". Si no puede, retorna null (no borra).
 */
function keyFromPublicUrl(u: string | null | undefined, publicBase?: string | null): string | null {
  if (!u) return null;
  if (publicBase && u.startsWith(publicBase)) {
    const rest = u.slice(publicBase.length).replace(/^\/+/, '');
    return rest || null;
  }
  // fallback opcional: si guardaste rutas como "/uploads/products/...."
  const m = u.match(/\/uploads\/products\/(.+)$/);
  return m ? m[1] : null;
}

// -------- handlers --------
export async function GET(_req: Request, ctx: any) {
  const { productId, imageId } = await readParams(ctx);
  if (productId == null || imageId == null) {
    return NextResponse.json({ ok: false, error: 'Parámetros inválidos' }, { status: 400 });
  }

  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img || img.productId !== productId) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: img });
}

export async function PUT(req: Request, ctx: any) {
  const { productId, imageId } = await readParams(ctx);
  if (productId == null || imageId == null) {
    return NextResponse.json({ ok: false, error: 'Parámetros inválidos' }, { status: 400 });
  }

  const current = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!current || current.productId !== productId) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  const body = await req.json<any>().catch(() => ({} as any));

  const data: any = {};
  if ('alt' in body) data.alt = strOrNull(body.alt);
  if ('sortOrder' in body) {
    const so = numOrNull(body.sortOrder);
    if (so !== null) data.sortOrder = so;
  }
  // Si querés permitir cambiar la URL (no común):
  if ('url' in body && typeof body.url === 'string' && body.url.trim() !== '') {
    data.url = body.url.trim();
  }

  const updated = await prisma.productImage.update({ where: { id: imageId }, data });

  await audit(req, 'product_image.update', 'product', String(productId), {
    imageId,
    changed: Object.keys(data),
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req: Request, ctx: any) {
  const { productId, imageId } = await readParams(ctx);
  if (productId == null || imageId == null) {
    return NextResponse.json({ ok: false, error: 'Parámetros inválidos' }, { status: 400 });
  }

  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img || img.productId !== productId) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  // Borra el registro en DB
  await prisma.productImage.delete({ where: { id: imageId } });

  // Intentar borrar el objeto en R2 si la URL coincide con tu base pública
  const publicBase = getEnv().PUBLIC_R2_BASE_URL || undefined;
  const key = keyFromPublicUrl(img.url, publicBase);
  if (key) {
    // deleteUpload ya maneja el caso de que no exista binding en dev
    await deleteUpload(key).catch(() => {});
  }

  await audit(req, 'product_image.delete', 'product', String(productId), { imageId, key });

  return NextResponse.json({ ok: true });
}
