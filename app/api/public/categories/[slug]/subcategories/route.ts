// app/api/public/categories/[slug]/subcategories/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';


const prisma = createPrisma();
// ⚠️ Next 15: no tipar el 2º argumento; usar destructuring con `any`
export async function GET(_req: Request, { params }: any) {
  const slug = String(params?.slug ?? '').trim();
  if (!slug) {
    return NextResponse.json({ error: 'missing slug' }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true },
  });

  if (!category) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const items = await prisma.subcategory.findMany({
    where: { categoryId: category.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ ok: true, category, items });
}
