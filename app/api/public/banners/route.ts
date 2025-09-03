import { json } from '@/lib/json';
export const runtime = 'edge';

import prisma from '@/lib/prisma';

export async function GET() {
  const items = await prisma.banner.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, title: true, imageUrl: true, link: true, sortOrder: true },
  });
  return json({ ok: true, items });
}
