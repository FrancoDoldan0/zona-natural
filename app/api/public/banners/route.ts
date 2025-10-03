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
  const wantDebug = url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;
  const now = new Date();

  const baseWhere: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  // Construimos el where con filtros (si corresponden)
  const whereWithFilters: any = { ...baseWhere };
  if (placement) whereWithFilters.placement = placement;
  if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
    whereWithFilters.categoryId = Number(categoryId);
  }

  // Orden y select mínimos
  const orderBy = [{ sortOrder: 'asc' as const }, { id: 'asc' as const }];
  const select = {
    id: true,
    title: true,
    imageUrl: true,
    imageKey: true,
    linkUrl: true, // si tu schema usa "link", Prisma lo puede mapear a linkUrl
    placement: true,
    categoryId: true,
    sortOrder: true,
  };

  const debug: any = { tried: [] as any[] };

  async function safeQuery(where: any, note: string) {
    try {
      const rows = await prisma.banner.findMany({ where, orderBy, select });
      debug.tried.push({ note, where, ok: true, count: rows.length });
      return { rows, err: null as any };
    } catch (e: any) {
      debug.tried.push({ note, where, ok: false, error: String(e?.message || e) });
      return { rows: [] as any[], err: e };
    }
  }

  // 1) con filtros
  let { rows, err } = await safeQuery(whereWithFilters, 'with-filters');

  // 2) fallback sin placement ni categoryId
  if (err) {
    const { rows: r2, err: e2 } = await safeQuery(baseWhere, 'base-where');
    rows = r2;
    err = e2;
  }

  // 3) último fallback: sin where (solo activos si algo del enum rompió el parseo)
  if (err) {
    const { rows: r3, err: e3 } = await safeQuery({}, 'no-where');
    rows = r3;
    err = e3;
  }

  // si aún falló todo, devolvemos vacío pero sin 500 (para no romper el front)
  if (err) {
    const payload: any = { ok: true, items: [] as any[] };
    if (wantDebug) payload.debug = debug;
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  }

  const items = rows
    .map((b: any) => ({
      id: b.id,
      title: b.title ?? '',
      url: b.imageKey ? publicR2Url(b.imageKey) : (b.imageUrl || ''),
      linkUrl: b.linkUrl ?? (b as any).link ?? null,
      placement: b.placement ?? null,
      categoryId: b.categoryId ?? null,
      sortOrder: b.sortOrder ?? 0,
    }))
    .filter((x) => x.url);

  const payload: any = { ok: true, items };
  if (wantDebug) payload.debug = debug;

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
