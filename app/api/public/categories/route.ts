// app/api/public/categories/route.ts
export const runtime = 'edge';

import { createPrisma } from '@/lib/prisma-edge';
import { json } from '@/lib/json';

const prisma = createPrisma();

export async function GET() {
  const cats = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      imageKey: true,
      subcats: {
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      },
    },
  });

  const items = cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    imageUrl: c.imageUrl ?? null,
    imageKey: c.imageKey ?? null,
    subcats: (c.subcats || []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  }));

  return json({ ok: true, items });
}
