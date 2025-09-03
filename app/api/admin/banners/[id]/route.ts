export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  link: z.string().url().nullable().optional(),
  active: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const item = await prisma.banner.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  const data = schema.parse(await req.json().catch(() => ({})));
  const updated = await prisma.banner.update({
    where: { id },
    data: {
      ...('title' in data ? { title: data.title! } : {}),
      ...('imageUrl' in data ? { imageUrl: data.imageUrl! } : {}),
      ...('link' in data ? { link: data.link ?? null } : {}),
      ...('active' in data ? { active: !!data.active } : {}),
      ...('sortOrder' in data ? { sortOrder: data.sortOrder! } : {}),
    },
  });
  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  await prisma.banner.delete({ where: { id } });
  return NextResponse.json({ ok: true, id, deleted: true });
}
