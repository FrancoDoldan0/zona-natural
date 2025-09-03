export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const productId = Number(params.id);
    if (!Number.isFinite(productId)) return bad('invalid_product_id', 400);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const order = Array.isArray(body.order) ? body.order : [];
    const desiredIds = order.map((v: any) => Number(v)).filter(Number.isFinite);

    const existing = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    if (desiredIds.length === 0 && existing.length === 0) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const existIds = new Set(existing.map((x) => x.id));
    for (const id of desiredIds) {
      if (!existIds.has(id)) return bad('unknown_or_mismatched_id', 400);
    }

    const included = desiredIds.map((id) => existing.find((x) => x.id === id)!);
    const remainder = existing.filter((x) => !desiredIds.includes(x.id));
    const final = [...included, ...remainder];

    const updates = final.map((img, i) =>
      prisma.productImage.update({ where: { id: img.id }, data: { sortOrder: i } }),
    );

    await prisma.$transaction(updates);

    const items = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'reorder_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
