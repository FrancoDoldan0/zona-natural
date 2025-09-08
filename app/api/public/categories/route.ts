import { json } from '@/lib/json';

const prisma = createPrisma();
export const runtime = 'edge';

import { createPrisma } from '@/lib/prisma-edge';

export async function GET() {
  const cats = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { subcats: { orderBy: { name: 'asc' } } },
  });
  const items = cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    subcats: (c.subcats || []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
  }));
  return json({ ok: true, items });
}
