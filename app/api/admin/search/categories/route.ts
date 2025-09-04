// app/api/admin/search/categories/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const takeRaw = searchParams.get('take') || '20';
    const take = Math.max(1, Math.min(50, Number(takeRaw) || 20));

    // En SQLite no hay QueryMode 'insensitive' tipado.
    // Quitamos `mode: 'insensitive'` y usamos contains “normal”.
    const where = q
      ? {
          OR: [
            { name: { contains: q } },
            { slug: { contains: q } },
          ],
        }
      : undefined;

    const items = await prisma.category.findMany({
      where,
      take,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'unknown_error' },
      { status: 500 }
    );
  }
}
