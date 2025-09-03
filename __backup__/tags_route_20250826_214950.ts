export const runtime = 'nodejs';
import { json } from '@/lib/json';
import prisma from '@/lib/prisma';

export async function GET() {
  const rows = await prisma.tag.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { productTags: true } } },
  });
  const items = rows.map((t) => ({
    id: t.id,
    name: t.name,
    productCount: t._count.productTags,
  }));
  return json({ ok: true, items });
}
