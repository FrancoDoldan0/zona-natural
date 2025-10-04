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

  // Filtros base (vigencia + activo)
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

  // Helpers
  const mapRows = (rows: any[]) =>
    rows
      .map((b: any) => ({
        id: Number(b.id),
        title: String(b.title ?? ''),
        url: String(b.imageUrl ?? ''), // usamos imageUrl (evitamos imageKey)
        linkUrl: (b.linkUrl ?? null) as string | null,
        placement: b.placement ?? null,
        categoryId: b.categoryId ?? null,
        sortOrder: b.sortOrder ?? 0,
      }))
      .filter((x) => x.url);

  // 1) Prisma SELECT mínimo (sin imageKey)
  try {
    const runPrisma = async (where: any, note: string) => {
      const rows = await prisma.banner.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          title: true,
          imageUrl: true,
          linkUrl: true, // en tu schema está mapeada a la columna `link`
          placement: true,
          categoryId: true,
          sortOrder: true,
        },
      });
      debug.tried.push({ note, where, ok: true, count: rows.length });
      return rows;
    };

    // a) con filtros
    let rows = await runPrisma(whereWithFilters, 'prisma/select-with-filters');

    // b) fallback SIN placement si no hubo resultados y se pidió placement
    if (rows.length === 0 && placement) {
      rows = await runPrisma(baseWhere, 'prisma/select-base-fallback');
    }

    const items = mapRows(rows);
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

  // 2) Fallback: SQL crudo (evita cualquier mapeo problemático)
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

    // Variante con columna `link` → la exponemos como linkUrl
    let sql = `
      SELECT id, title, "imageUrl", "link" AS "linkUrl", "placement", "categoryId", "sortOrder"
      FROM "Banner"
      ${whereSql}
      ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
    `;
    let rows: any[] = await prisma.$queryRawUnsafe(sql);
    debug.tried.push({ note: 'raw/link', sql, ok: true, count: rows?.length ?? 0 });

    // Fallback sin placement si no hubo resultados y se había pedido
    if ((rows?.length ?? 0) === 0 && placement) {
      const condsNoPlacement = conds.filter((c) => !c.startsWith(`"placement"`));
      const whereSql2 = condsNoPlacement.length ? `WHERE ${condsNoPlacement.join(' AND ')}` : '';
      sql = `
        SELECT id, title, "imageUrl", "link" AS "linkUrl", "placement", "categoryId", "sortOrder"
        FROM "Banner"
        ${whereSql2}
        ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
      `;
      rows = await prisma.$queryRawUnsafe(sql);
      debug.tried.push({
        note: 'raw/link-base-fallback',
        sql,
        ok: true,
        count: rows?.length ?? 0,
      });
    }

    // Si tu tabla no tiene `link`, intento con `linkUrl`
    if ((rows?.length ?? 0) === 0) {
      const whereSql3 = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      sql = `
        SELECT id, title, "imageUrl", "linkUrl", "placement", "categoryId", "sortOrder"
        FROM "Banner"
        ${whereSql3}
        ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
      `;
      rows = await prisma.$queryRawUnsafe(sql);
      debug.tried.push({ note: 'raw/linkUrl', sql, ok: true, count: rows?.length ?? 0 });

      if ((rows?.length ?? 0) === 0 && placement) {
        const condsNoPlacement2 = conds.filter((c) => !c.startsWith(`"placement"`));
        const whereSql4 = condsNoPlacement2.length
          ? `WHERE ${condsNoPlacement2.join(' AND ')}`
          : '';
        sql = `
          SELECT id, title, "imageUrl", "linkUrl", "placement", "categoryId", "sortOrder"
          FROM "Banner"
          ${whereSql4}
          ORDER BY "sortOrder" ASC NULLS FIRST, id ASC
        `;
        rows = await prisma.$queryRawUnsafe(sql);
        debug.tried.push({
          note: 'raw/linkUrl-base-fallback',
          sql,
          ok: true,
          count: rows?.length ?? 0,
        });
      }
    }

    const items = mapRows(rows || []);
    return NextResponse.json(
      { ok: true, items, ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    debug.tried.push({ note: 'raw-failed', ok: false, error: String(e?.message || e) });
  }

  // 3) Último recurso: vacío (no rompemos el front)
  return NextResponse.json(
    { ok: true, items: [], ...(wantDebug ? { debug } : null) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
