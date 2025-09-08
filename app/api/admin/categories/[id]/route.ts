// app/api/admin/categories/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { audit } from '@/lib/audit';

// Lee el id desde ctx.params (objeto o promesa en Next 15)
async function readId(ctx: any): Promise<number | null> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const id = obj?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

export async function GET(_req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const item = await prisma.category.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json<any>().catch(() => ({} as any));
  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.slug === 'string') data.slug = body.slug.trim();

  const item = await prisma.category.update({ where: { id }, data });

  await audit(req, 'category.update', 'category', String(id), { data });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });

  await audit(req, 'category.delete', 'category', String(id));

  return NextResponse.json({ ok: true });
}
