export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const baseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  discountVal: z.coerce.number().positive(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  productId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  tagId: z.coerce.number().int().positive().optional().nullable(),
});

function parseDates(v: any) {
  const s = v?.startAt ? new Date(v.startAt) : null;
  const e = v?.endAt ? new Date(v.endAt) : null;
  if (s && isNaN(+s)) throw new Error('startAt inválido');
  if (e && isNaN(+e)) throw new Error('endAt inválido');
  if (s && e && e < s) throw new Error('endAt < startAt');
  return { s, e };
}

function checkTargets(v: any) {
  const tgt = [v.productId ?? null, v.categoryId ?? null, v.tagId ?? null].filter((x) => x != null);
  if (tgt.length > 1) throw new Error('Solo se permite un destino (producto O categoría O tag)');
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const active = url.searchParams.get('active') === '1';
  const now = new Date();

  const where = active
    ? {
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      }
    : {};

  const items = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      tag: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = baseSchema.parse(await req.json());
    checkTargets(body);
    if (body.discountType === 'PERCENT' && (body.discountVal <= 0 || body.discountVal > 100)) {
      return NextResponse.json(
        { ok: false, error: 'PERCENT debe estar entre 0 y 100' },
        { status: 400 },
      );
    }
    const { s, e } = parseDates(body);

    const created = await prisma.offer.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        discountType: body.discountType,
        discountVal: body.discountVal,
        startAt: s,
        endAt: e,
        productId: body.productId ?? null,
        categoryId: body.categoryId ?? null,
        tagId: body.tagId ?? null,
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        tag: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    const msg = e?.issues ? 'Datos inválidos' : e?.message || 'Error';
    return NextResponse.json({ ok: false, error: msg, issues: e?.issues }, { status: 400 });
  }
}
