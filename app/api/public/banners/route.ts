// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

function toPlacement(p: string | null):
  | 'HOME'
  | 'PRODUCTS'
  | 'CATEGORY'
  | 'CHECKOUT'
  | undefined {
  if (!p) return undefined;
  switch (p.trim().toLowerCase()) {
    case 'home':
      return 'HOME';
    case 'products':
      return 'PRODUCTS';
    case 'category':
      return 'CATEGORY';
    case 'checkout':
      return 'CHECKOUT';
    default:
      return undefined;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;
  const now = new Date();

  // base: activos dentro de la ventana temporal
  const baseWhere: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  // construimos el where completo (incluye placement si viene)
  const where: any = { ...baseWhere };
  if (placement) where.placement = placement;
  if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
    where.categoryId = Number(categoryId);
  }

  // select mínimo y orden estable
  const select = {
    id: true,
    title: true,
    imageUrl: true,
    imageKey: true,
    linkUrl: true, // si en tu schema está mapeado a "link", Prisma ya lo expone como linkUrl
    placement: true,
    categoryId: true,
    sortOrder: true,
  } as const;

  let rows: any[] = [];
  try {
    // intento 1: con placement
    rows = await prisma.banner.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select,
    });
  } catch (err) {
    // fallback: sin filtro de placement (algunas combos enum/accelerate fallan)
    console.error('[banners] fallo con placement, reintento sin placement:', err);
    const whereFallback = { ...baseWhere };
    if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
      (whereFallback as any).categoryId = Number(categoryId);
    }
    rows = await prisma.banner.findMany({
      where: whereFallback,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select,
    });
  }

  const items = rows.map((b: any) => ({
    id: b.id,
    title: b.title ?? '',
    // priorizamos R2 (imageKey), si no, legacy imageUrl
    url: b.imageKey ? publicR2Url(b.imageKey) : b.imageUrl || '',
    // aceptamos linkUrl o (por si acaso) link legacy
    linkUrl: b.linkUrl ?? (b as any).link ?? null,
    placement: b.placement ?? null,
    categoryId: b.categoryId ?? null,
    sortOrder: b.sortOrder ?? 0,
  })).filter((x: any) => x.url);

  return NextResponse.json(
    { ok: true, items },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
