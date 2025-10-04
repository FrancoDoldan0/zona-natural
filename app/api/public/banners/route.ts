// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';

const prisma = createPrisma();

// ───────── helpers ─────────
const esc = (s: string) => s.replace(/'/g, "''");

function toPlacement(
  p: string | null,
): 'HOME' | 'PRODUCTS' | 'CATEGORY' | 'CHECKOUT' | undefined {
  if (!p) return undefined;
  switch (p.trim().toLowerCase()) {
    case 'home': return 'HOME';
    case 'products': return 'PRODUCTS';
    case 'category': return 'CATEGORY';
    case 'checkout': return 'CHECKOUT';
    default: return undefined;
  }
}

async function getBannerTableName(): Promise<string> {
  // Soporta "banner" o "Banner"
  const rows: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND lower(table_name) = 'banner'
    LIMIT 1
  `);
  const name = rows?.[0]?.table_name ?? 'Banner';
  return `"${name}"`;
}

async function getBannerColumns(tblQuoted: string): Promise<Set<string>> {
  const tbl = tblQuoted.replace(/^"+|"+$/g, '');
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT "column_name"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${esc(tbl)}'
  `);
  return new Set(rows.map((r) => r.column_name));
}

// ───────── GET ─────────
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantDebug =
    url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  const debug: any = { tries: [] as any[], cols: null };

  try {
    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);
    debug.cols = Array.from(cols);

    // SELECT con alias para soportar esquemas legacy
    const sel: string[] = ['id', `"title"`];

    // imagen → siempre exponemos como imageUrl
    if (cols.has('imageUrl')) sel.push(`"imageUrl"`);
    else if (cols.has('image')) sel.push(`"image" AS "imageUrl"`);
    else sel.push(`NULL AS "imageUrl"`);

    // link → normalizamos a linkUrl
    if (cols.has('linkUrl')) sel.push(`"linkUrl"`);
    else if (cols.has('link')) sel.push(`"link" AS "linkUrl"`);
    else sel.push(`NULL AS "linkUrl"`);

    // opcionales
    if (cols.has('placement')) sel.push(`"placement"`);
    else sel.push(`NULL AS "placement"`);
    if (cols.has('categoryId')) sel.push(`"categoryId"`);
    else sel.push(`NULL AS "categoryId"`);
    if (cols.has('sortOrder')) sel.push(`"sortOrder"`);
    else sel.push(`0 AS "sortOrder"`);

    // WHERE builder (parametrizable para incluir/omitir placement/category)
    const buildWhere = (usePlacement: boolean) => {
      const where: string[] = [];

      // activo (aceptar isActive/active)
      if (cols.has('isActive') && cols.has('active')) {
        where.push(`("isActive" = TRUE OR "active" = TRUE)`);
      } else if (cols.has('isActive')) {
        where.push(`"isActive" = TRUE`);
      } else if (cols.has('active')) {
        where.push(`"active" = TRUE`);
      }

      if (cols.has('startAt')) where.push(`("startAt" IS NULL OR "startAt" <= CURRENT_TIMESTAMP)`);
      if (cols.has('endAt')) where.push(`("endAt"   IS NULL OR "endAt"   >= CURRENT_TIMESTAMP)`);

      if (usePlacement && placement && cols.has('placement')) {
        where.push(`"placement" = '${placement}'`);
      }
      if (
        usePlacement &&
        placement === 'CATEGORY' &&
        Number.isFinite(categoryId) &&
        cols.has('categoryId')
      ) {
        where.push(`"categoryId" = ${Number(categoryId)}`);
      }

      return where.length ? `WHERE ${where.join(' AND ')}` : '';
    };

    // ORDER BY seguro
    const orderSql = cols.has('sortOrder')
      ? `"sortOrder" ASC NULLS FIRST, id ASC`
      : `id ASC`;

    // Intentos:
    // 1) con placement (si se pidió)
    // 2) si no hay resultados, reintentar SIN placement (para mostrar banners aunque no tenga esa columna/valor)
    const attempts: Array<{ usePlacement: boolean }> =
      placement ? [{ usePlacement: true }, { usePlacement: false }] : [{ usePlacement: false }];

    for (const a of attempts) {
      const sql = `
        SELECT ${sel.join(', ')}
        FROM ${tbl}
        ${buildWhere(a.usePlacement)}
        ORDER BY ${orderSql}
      `;
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(sql);
        debug.tries.push({ ok: true, usePlacement: a.usePlacement, count: rows.length, sql });

        const items = (rows || [])
          .map((r) => ({
            id: Number(r.id),
            title: String(r.title ?? ''),
            url: String(r.imageUrl ?? ''),
            linkUrl: r.linkUrl ?? null,
            placement: r.placement ?? null,
            categoryId: r.categoryId ?? null,
            sortOrder: Number(r.sortOrder ?? 0),
          }))
          .filter((x) => x.url);

        // devolvemos en el primer intento con resultados
        if (items.length || !placement || !a.usePlacement) {
          return NextResponse.json(
            { ok: true, items, ...(wantDebug ? { debug } : null) },
            { headers: { 'Cache-Control': 'no-store' } },
          );
        }
        // si no hubo resultados y era con placement, seguimos al intento sin placement
      } catch (e: any) {
        debug.tries.push({
          ok: false,
          usePlacement: a.usePlacement,
          error: String(e?.message || e),
          sql,
        });
        // si falla este intento, probamos el siguiente (más laxo)
        continue;
      }
    }

    // Si llegamos acá, no hubo resultados (o fallas) en todos los intentos
    return NextResponse.json(
      { ok: true, items: [], ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    debug.tries.push({ ok: false, fatal: String(e?.message || e) });
    return NextResponse.json(
      { ok: true, items: [], ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
