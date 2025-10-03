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
    case 'home': return 'HOME';
    case 'products': return 'PRODUCTS';
    case 'category': return 'CATEGORY';
    case 'checkout': return 'CHECKOUT';
    default: return undefined;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantDebug = url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;
  const now = new Date();

  // where base (fechas activas)
  const baseWhere: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  // with filters
  const whereWithFilters: any = { ...baseWhere };
  if (placement) whereWithFilters.placement = placement;
  if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
    whereWithFilters.categoryId = Number(categoryId);
  }

  const debug: any = { tried: [] as any[] };

  async function safeQuery(where: any, note: string) {
    try {
      // ⚠️ sin `select` y orden seguro por `id` (evita fallos si sortOrder no existe)
      const rows = await prisma.banner.findMany({
        where,
        orderBy: { id: 'asc' },
      });
      debug.tried.push({ note, where, ok: true, count: rows.length });
      return { rows, err: null as any };
    } catch (e: any) {
      debug.tried.push({ note, where, ok: false, error: String(e?.message || e) });
      return { rows: [] as any[], err: e };
    }
  }

  // 1) con filtros
  let { rows, err } = await safeQuery(whereWithFilters, 'with-filters');

  // 2) fallback a baseWhere
  if (err) {
    const r2 = await safeQuery(baseWhere, 'base-where');
    rows = r2.rows; err = r2.err;
  }

  // 3) último fallback sin where (evita 500 por enums/columns)
  if (err) {
    const r3 = await safeQuery({}, 'no-where');
    rows = r3.rows; err = r3.err;
  }

  // Si aún falló algo, no romper el front
  if (err) {
    const payload: any = { ok: true, items: [] as any[] };
    if (wantDebug) payload.debug = debug;
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  }

  // Map robusto: preferimos imageKey→R2; si no, imageUrl; linkUrl o link (legacy)
  const items = rows
    .map((b: any) => {
      const key = b?.imageKey ?? null;          // podría no existir en tu DB
      const imageUrl = b?.imageUrl ?? '';
      const urlOut = key ? publicR2Url(key) : imageUrl;
      const linkOut = b?.linkUrl ?? b?.link ?? null;

      return {
        id: b.id,
        title: b.title ?? '',
        url: urlOut,
        linkUrl: linkOut,
        placement: b?.placement ?? null,
        categoryId: b?.categoryId ?? null,
        sortOrder: b?.sortOrder ?? 0,
      };
    })
    .filter((x: any) => x.url); // solo con URL

  const payload: any = { ok: true, items };
  if (wantDebug) payload.debug = debug;

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
