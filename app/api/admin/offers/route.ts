export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { audit } from '@/lib/audit';

const Body = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(['PERCENT', 'AMOUNT']),
  discountVal: z.coerce.number().positive(),
  startAt: z.string().or(z.date()).optional().nullable(),
  endAt: z.string().or(z.date()).optional().nullable(),
  productId: z.coerce.number().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
});

export async function GET() {
  try {
    const items = await prisma.offer.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json<any>();
    const parsed = Body.safeParse(json);
    if (!parsed.success)
      return NextResponse.json(
        { ok: false, error: 'validation_failed', detail: parsed.error.format() },
        { status: 400 },
      );
    const b = parsed.data;
    const created = await prisma.offer.create({
      data: {
        title: b.title,
        description: b.description ?? null,
        discountType: b.discountType,
        discountVal: b.discountVal,
        startAt: b.startAt ? new Date(b.startAt as any) : null,
        endAt: b.endAt ? new Date(b.endAt as any) : null,
        productId: b.productId ?? null,
        categoryId: b.categoryId ?? null,
      },
    });
    await audit(req, 'CREATE', 'Offer', created.id, b);
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_post_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
