// app/api/admin/products/[id]/images/reorder/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

/* ---------- helpers ---------- */
function extractProductId(req: Request): number | null {
  const { pathname } = new URL(req.url);
  // Coincide con .../products/:id/images/reorder en cualquier prefijo
  const m = pathname.match(/\/products\/([^/]+)\/images\/reorder/);
  const n = Number(m?.[1]);
  return Number.isFinite(n) ? n : null;
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
export async function POST(req: Request) {
  const productId = extractProductId(req);
  if (productId == null) {
    return NextResponse.json(
      { ok: false, error: 'Parámetro productId inválido' },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as any;
  const desiredIdsRaw: unknown = body?.desiredIds ?? body?.ids ?? body?.order;
  const desiredIds = toNumberList(desiredIdsRaw);

  try {
    // Traemos las imágenes actuales (id y sortOrder)
    const existing = await (prisma as any).productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { id: true, sortOrder: true },
    });

    if (existing.length === 0) {
      return NextResponse.json({ ok: true, final: [] });
    }

    const existingIds = new Set(existing.map((x: any) => x.id));

    // Nos quedamos sólo con los deseados que pertenecen al producto
    const included = desiredIds.filter((id) => existingIds.has(id));

    // El resto mantiene su orden actual
    const remainder = existing
      .map((x: any) => x.id)
      .filter((id: number) => !included.includes(id));

    const finalOrderIds = [...included, ...remainder];

    // Aplicamos sortOrder secuencial (0,1,2,...)
    const tx = finalOrderIds.map((id, idx) =>
      (prisma as any).productImage.update({
        where: { id },
        data: { sortOrder: idx },
      })
    );
    await (prisma as any).$transaction(tx);

    await audit(req, 'product_images.reorder', 'product', String(productId), {
      desiredIds,
      finalOrder: finalOrderIds,
    });

    return NextResponse.json({ ok: true, final: finalOrderIds });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'db_error', detail: (err as Error)?.message ?? String(err) },
      { status: 500 }
    );
  }
}
