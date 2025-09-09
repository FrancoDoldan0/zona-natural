// app/api/admin/offers/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';


const prisma = createPrisma();
// --- helpers ---
async function readId(ctx: any): Promise<number | null> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const id = obj?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
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

function dateOrNull(v: unknown) {
  if (!v) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

type DiscountType = 'PERCENT' | 'AMOUNT';
function parseDiscountType(v: unknown): DiscountType | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().toUpperCase();
  return s === 'PERCENT' || s === 'AMOUNT' ? (s as DiscountType) : null;
}

// --- GET ---
export async function GET(_req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const item = await prisma.offer.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}

// --- PUT (update) ---
export async function PUT(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json<any>().catch(() => ({} as any));

  const data: any = {};
  const title = strOrNull(body.title);
  if (title !== null) data.title = title;

  // puede venir vacío => null
  const description = typeof body.description === 'string' ? body.description : null;
  if (description !== undefined) data.description = description;

  const dt = parseDiscountType(body.discountType);
  if (dt) data.discountType = dt;

  const discountVal = numOrNull(body.discountVal);
  if (discountVal !== null) data.discountVal = discountVal;

  const startAt = dateOrNull(body.startAt);
  if (body.startAt !== undefined) data.startAt = startAt;

  const endAt = dateOrNull(body.endAt);
  if (body.endAt !== undefined) data.endAt = endAt;

  const productId = numOrNull(body.productId);
  if (body.productId !== undefined) data.productId = productId;

  const categoryId = numOrNull(body.categoryId);
  if (body.categoryId !== undefined) data.categoryId = categoryId;

  const tagId = numOrNull(body.tagId);
  if (body.tagId !== undefined) data.tagId = tagId;

  const item = await prisma.offer.update({ where: { id }, data });

  await audit(req, 'offer.update', 'offer', String(id), { data });

  return NextResponse.json({ ok: true, item });
}

// --- DELETE ---
export async function DELETE(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  await prisma.offer.delete({ where: { id } });

  await audit(req, 'offer.delete', 'offer', String(id));

  return NextResponse.json({ ok: true });
}
