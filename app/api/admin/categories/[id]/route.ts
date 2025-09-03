export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id))
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if (typeof body?.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.slug === 'string' && body.slug.trim()) data.slug = slugify(body.slug);

  const item = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id))
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  try {
    // Borra subcategorías y desasocia productos que dependan
    await prisma.$transaction([
      prisma.subcategory.deleteMany({ where: { categoryId: id } }),
      prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
      prisma.category.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true, deleted: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo borrar' }, { status: 409 });
  }
}
