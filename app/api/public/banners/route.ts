// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';

const prisma = createPrisma();

// ───────────────── helpers ─────────────────
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

// ───────────────── GET ─────────────────
export async function GET(req: Request) {
  const url = new URL(req.url);
  const wantDebug =
    url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  const placement = toPlacement(url.searchParams.get('placement'));
  const categoryIdRaw = url.searchParams.get('categoryId');
  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : undefined;

  const debug: any = { sqlBuilt: null, cols: null, note: [] as any[] };

  try {
    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);
    debug.cols = Array.from(cols);

    // SELECT con alias para soportar esquemas legacy
    const sel: string[] = ['id', `"title"`];

    // imagen: preferimos imageUrl; si existe solo "image", lo exponemos como imageUrl
    if (cols.has('imageUrl')) sel.push(`"imageUrl"`);
    else if (cols.has('image')) sel.push(`"image" AS "imageUrl"`);
    else sel.push(`NULL AS "imageUrl"`);

    // link: linkUrl o link
    if (cols.has('linkUrl')) sel.push(`"linkUrl"`);
    else if (cols.has('link')) sel.push(`"link" AS "linkUrl"`);
    else sel.push(`NULL AS "linkUrl"`);

    // columnas opcionales
    if (cols.has('placement')) sel.push(`"placement"`);
    else sel.push(`NULL AS "placement"`);

    if (cols.has('categoryId')) sel.push(`"categoryId"`);
    else sel.push(`NULL AS "categoryId"`);

    if (cols.has('sortOrder')) sel.push(`"sortOrder"`);
    else sel.push(`0 AS "sortOrder"`);

    // WHERE dinámico (solo agregamos condiciones si la columna existe)
    const where: string[] = [];

    if (cols.has('isActive')) where.push(`"isActive" = TRUE`);
    else if (cols.has('active')) where.push(`"active" = TRUE`);

    if (cols.has('startAt')) where.push(`("startAt" IS NULL OR "startAt" <= CURRENT_TIMESTAMP)`);
    if (cols.has('endAt')) where.push(`("endAt" IS NULL OR "endAt" >= CURRENT_TIMESTAMP)`);

    if (placement && cols.has('placement')) {
      where.push(`"placement" = '${placement}'`);
    }
    if (
      placement === 'CATEGORY' &&
      Number.isFinite(categoryId) &&
      cols.has('categoryId')
    ) {
      where.push(`"categoryId" = ${Number(categoryId)}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // ORDER BY seguro
    const order = cols.has('sortOrder')
      ? `"sortOrder" ASC NULLS FIRST, id ASC`
      : `id ASC`;

    const sql = `
      SELECT ${sel.join(', ')}
      FROM ${tbl}
      ${whereSql}
      ORDER BY ${order}
    `;
    debug.sqlBuilt = sql;

    const rows: any[] = await prisma.$queryRawUnsafe(sql);

    const items = (rows || [])
      .map((r) => ({
        id: Number(r.id),
        title: String(r.title ?? ''),
        url: String(r.imageUrl ?? ''),    // siempre exponemos imageUrl
        linkUrl: r.linkUrl ?? null,
        placement: r.placement ?? null,
        categoryId: r.categoryId ?? null,
        sortOrder: r.sortOrder ?? 0,
      }))
      .filter((x) => x.url);

    return NextResponse.json(
      { ok: true, items, ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    debug.note.push({ ok: false, error: String(e?.message || e) });
    // No rompemos el front si el esquema es diferente
    return NextResponse.json(
      { ok: true, items: [], ...(wantDebug ? { debug } : null) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
