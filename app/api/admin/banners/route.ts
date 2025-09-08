export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),
  link: z.string().url().optional().nullable(),
  active: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === '1';
  const items = await prisma.banner.findMany({
    where: all ? {} : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json<any>());
    const created = await prisma.banner.create({
      data: {
        title: body.title,
        imageUrl: body.imageUrl,
        link: body.link ?? null,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return NextResponse.json({ ok: true, item: created });
  } catch (e: any) {
    if (e?.issues)
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos', issues: e.issues },
        { status: 400 },
      );
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
