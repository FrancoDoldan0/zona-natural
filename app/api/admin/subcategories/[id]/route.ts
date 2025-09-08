// app/api/admin/subcategories/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';


const prisma = createPrisma();
// ⚠️ Next 15: NO tipar el 2º argumento. Usamos { params }: any
export async function GET(_req: Request, { params }: any) {
  const id = Number(params?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const item = await prisma.subcategory.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, { params }: any) {
  const id = Number(params?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const body = (await req.json<any>().catch(() => ({}))) as {
    name?: string;
    slug?: string | null;
    categoryId?: number | string | null;
  };

  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.slug === 'string') data.slug = body.slug.trim();
  if (body.slug === null) data.slug = null;

  if (body.categoryId === null) data.categoryId = null;
  else if (body.categoryId !== undefined) {
    const cid = Number(body.categoryId);
    if (Number.isFinite(cid)) data.categoryId = cid;
  }

  const item = await prisma.subcategory.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_req: Request, { params }: any) {
  const id = Number(params?.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  await prisma.subcategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
