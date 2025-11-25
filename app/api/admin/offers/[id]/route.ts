// app/api/admin/offers/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

type RouteContext = { params: { id: string } };

// --- helpers ---------------------------------------------------------------

async function readId(ctx: RouteContext): Promise<number | null> {
  const raw = ctx?.params?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function strOrNull(v: unknown) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

// ⚠️ IMPORTANTE: no transformar null / '' en 0
function numOrNull(v: unknown) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateOrNull(v: unknown) {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

type DiscountType = 'PERCENT' | 'AMOUNT';
function parseDiscountType(v: unknown): DiscountType | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toUpperCase();
  return s === 'PERCENT' || s === 'AMOUNT' ? (s as DiscountType) : null;
}

// --- GET -------------------------------------------------------------------

export async function GET(_req: Request, ctx: RouteContext) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const item = await prisma.offer.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_get_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

// --- PUT (update) ----------------------------------------------------------

export async function PUT(req: Request, ctx: RouteContext) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const data: any = {};

    const title = strOrNull(body.title);
    if (title !== null) data.title = title;

    if ('description' in body) {
      data.description =
        typeof body.description === 'string' ? body.description : null;
    }

    const dt = parseDiscountType(body.discountType);
    if (dt) data.discountType = dt;

    if ('discountVal' in body) {
      const n = Number(body.discountVal);
      if (Number.isFinite(n)) data.discountVal = n;
    }

    if ('startAt' in body) {
      data.startAt = dateOrNull(body.startAt);
    }
    if ('endAt' in body) {
      data.endAt = dateOrNull(body.endAt);
    }

    // Destino (producto, categoría o tag). Permitimos limpiar a null.
    if ('productId' in body || 'categoryId' in body || 'tagId' in body) {
      const productId = numOrNull(body.productId);
      const categoryId = numOrNull(body.categoryId);
      const tagId = numOrNull(body.tagId);

      const targets = [productId, categoryId, tagId].filter((v) => v != null);
      if (targets.length > 1) {
        return NextResponse.json(
          { ok: false, error: 'only_one_target' },
          { status: 400 },
        );
      }

      data.productId = productId ?? null;
      data.categoryId = categoryId ?? null;
      data.tagId = tagId ?? null;
    }

    const item = await prisma.offer.update({ where: { id }, data });

    // No dejamos que un error de audit rompa el update
    try {
      await audit(req, 'UPDATE', 'Offer', String(id), { data });
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_update_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

// --- DELETE ----------------------------------------------------------------

export async function DELETE(req: Request, ctx: RouteContext) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    await prisma.offer.delete({ where: { id } });

    try {
      await audit(req, 'DELETE', 'Offer', String(id));
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
