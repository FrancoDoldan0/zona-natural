// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

function toPlacement(
  p: string | null,
): 'HOME' | 'PRODUCTS' | 'CATEGORY' | 'CHECKOUT' | undefined {
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
  const wantDebug =
    url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  const now = new Date();

  // Filtros base (fechas vigentes + activo)
  const baseWhere: any = {
    isActive: true,
    AND: [
      { OR: [{ startAt: null }, { startAt: { lte: now } }] },
      { OR: [{ endAt: null }, { endAt: { gte: now } }] },
    ],
  };

  const whereWithFilters: any = { ...baseWhere };
  if (placement) whereWithFilters.placement = placement;
  if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
    whereWithFilters.categoryId = Number(categoryId);
  }

  const debug: any = { tried: [] as any[] };

  // ─────────────────────────────────────────────────────────────
  // 1) Intento con Prisma seleccionando SOLO columnas existentes
  //    (no pedimos imageKey para evitar el error de columna inexistente)
  // ─────────────────────────────────────────────────────────────
  try {
    const rows = await prisma.banner.findMany({
      where: whereWithFilters,
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        imageUrl: true, // existe en tu DB
        linkUrl: true, // mapeada a columna "link" en tu schema
        placement: true,
        categoryId: true,
        sortOrder: true,
        // NO seleccionar imageKey aquí
      },
    });

    debug.tried.push({ note: 'prisma/select', where: whereWithFilters, ok: true, count: rows.length });

    const items = rows
      .map((b) => ({
        id: b.id,
        title: b.title ?? '',
        url: String(b.imageUrl ?? ''), // usamos imageUrl directo
        linkUrl: (b.linkUrl ?? null) as string | null,
        placement: b.placement ?? null,
        categoryId: b.categoryId ?? null,
        sortOrder: b.sortOrder ?? 0,
      }))
      .filter((x) => x.url);

    return NextResponse.json(
      { ok: true, items, ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    debug.tried.push({
      note: 'prisma/select-failed',
      where: whereWithFilters,
      ok: false,
      error: String(e?.message || e),
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 2) Fallback: SQL crudo para esquivar por completo imageKey
  //    (selecciona sólo columnas existentes; aplica mismos filtros)
  // ─────────────────────────────────────────────────────────────
  try {
    const conds: string[] = [
      `"isActive" = TRUE`,
      `("startAt" IS NULL OR "startAt" <= CURRENT_TIMESTAMP)`,
      `("endAt" IS NULL OR "endAt" >= CURRENT_TIMESTAMP)`,
    ];
    if (placement) conds.push(`"placement" = '${placement}'`);
    if (placement === 'CATEGORY' && Number.isFinite(categoryId)) {
      conds.push(`"categoryId" = ${Number(categoryId)}`);
    }
    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    // Variante 2a: DB con columna "link" (lo más común) → la exponemos como linkUrl
    let sql = `
      SELECT id, title, "imageUrl", "link" AS "linkUrl", "placement", "categoryId", "sortOrder"
      FROM "Banner"
      ${whereSql}
      ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
    `;

    let rows: any[] = await prisma.$queryRawUnsafe(sql);
    debug.tried.push({ note: 'raw/link', sql, ok: true, count: rows?.length ?? 0 });

    // Si no trajo datos (o si tu tabla no tiene "link"), intento con "linkUrl" directo
    if (!Array.isArray(rows) || rows.length === 0) {
      sql = `
        SELECT id, title, "imageUrl", "linkUrl", "placement", "categoryId", "sortOrder"
        FROM "Banner"
        ${whereSql}
        ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
      `;
      rows = await prisma.$queryRawUnsafe(sql);
      debug.tried.push({ note: 'raw/linkUrl', sql, ok: true, count: rows?.length ?? 0 });
    }

    const items = (rows || [])
      .map((b: any) => ({
        id: Number(b.id),
        title: String(b.title ?? ''),
        url: String(b.imageUrl ?? ''), // sin R2 key
        linkUrl: (b.linkUrl ?? null) as string | null,
        placement: b.placement ?? null,
        categoryId: b.categoryId ?? null,
        sortOrder: b.sortOrder ?? 0,
      }))
      .filter((x) => x.url);

    return NextResponse.json(
      { ok: true, items, ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    debug.tried.push({ note: 'raw-failed', ok: false, error: String(e?.message || e) });
  }

  // ─────────────────────────────────────────────────────────────
  // 3) Último recurso: responder vacío para no romper el front
  // ─────────────────────────────────────────────────────────────
  return NextResponse.json(
    { ok: true, items: [], ...(wantDebug ? { debug } : null) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
