// app/api/admin/products/[id]/images/reorder/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { audit } from '@/lib/audit';

/* ---------- helpers ---------- */
async function readParams(ctx: any): Promise<{ productId: number | null }> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const n = Number(obj?.id);
  return { productId: Number.isFinite(n) ? n : null };
}

function toNumberList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  const out: number[] = [];
  for (const x of v) {
    const n = Number(x);
    if (Number.isFinite(n)) out.push(n);
  }
  // dedupe preservando orden
  return Array.from(new Set(out));
}

/* ---------- POST: reordenar imágenes ---------- */
export async function POST(req: Request, ctx: any) {
  const { productId } = await readParams(ctx);
  if (productId == null) {
    return NextResponse.json({ ok: false, error: 'Parámetro productId inválido' }, { status: 400 });
  }

  const body = await req.json<any>().catch(() => ({} as any));
  const desiredIdsRaw: unknown = body?.desiredIds ?? body?.ids ?? body?.order;
  const desiredIds = toNumberList(desiredIdsRaw);

  // Traemos las imágenes actuales (id y sortOrder)
  const existing = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, sortOrder: true },
  });

  if (existing.length === 0) {
    return NextResponse.json({ ok: true, final: [] });
  }

  const existingIds = new Set(existing.map((x) => x.id));

  // Nos quedamos sólo con los deseados que pertenecen al producto
  const included = desiredIds.filter((id) => existingIds.has(id));

  // El resto mantiene su orden actual
  const remainder = existing
    .map((x) => x.id)
    .filter((id) => !included.includes(id));

  const finalOrderIds = [...included, ...remainder];

  // Aplicamos sortOrder secuencial (0,1,2,...)
  const tx = finalOrderIds.map((id, idx) =>
    prisma.productImage.update({ where: { id }, data: { sortOrder: idx } }),
  );
  await prisma.$transaction(tx);

  await audit(req, 'product_images.reorder', 'product', String(productId), {
    desiredIds,
    finalOrder: finalOrderIds,
  });

  return NextResponse.json({ ok: true, final: finalOrderIds });
}
