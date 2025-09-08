import { json } from '@/lib/json';

const prisma = createPrisma();
export const runtime = 'edge';

import { createPrisma } from '@/lib/prisma-edge';

export async function GET() {
  const items = await prisma.banner.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: { id: true, title: true, imageUrl: true, link: true, sortOrder: true },
  });
  return json({ ok: true, items });
}
