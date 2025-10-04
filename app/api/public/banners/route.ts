// app/api/public/banners/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { publicR2Url } from '@/lib/storage';

const prisma = createPrisma();

// ---------- helpers ----------
const esc = (s: string) => s.replace(/'/g, "''");

async function getBannerTableName(): Promise<string> {
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

// ---------- GET ----------
export async function GET(req: Request) {
  const url = new URL(req.url);
  const dbg = url.searchParams.get('_debug') === '1' || url.searchParams.get('debug') === '1';

  try {
    const placementWanted = (url.searchParams.get('placement') || '').trim().toUpperCase();
    const categoryId = url.searchParams.get('categoryId');

    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    // SELECT seguro (solo columnas existentes)
    const select: string[] = ['id', `"title"`];
    if (cols.has('imageKey')) select.push(`"imageKey"`);
    if (cols.has('imageUrl')) select.push(`"imageUrl"`);
    if (cols.has('linkUrl'))  select.push(`"linkUrl"`);
    if (cols.has('link'))     select.push(`"link"`);
    if (cols.has('placement')) select.push(`"placement"`);
    if (cols.has('categoryId')) select.push(`"categoryId"`);
    if (cols.has('sortOrder'))  select.push(`"sortOrder"`);

    // WHERE: activo + ventanas de fecha (si existen)
    const whereParts: string[] = [];
    if (cols.has('isActive')) whereParts.push(`"isActive" = TRUE`);
    else if (cols.has('active')) whereParts.push(`"active" = TRUE`);

    if (cols.has('startAt')) whereParts.push(`("startAt" IS NULL OR "startAt" <= NOW())`);
    if (cols.has('endAt'))   whereParts.push(`("endAt"   IS NULL OR "endAt"   >= NOW())`);

    if (placementWanted && cols.has('placement')) {
      whereParts.push(`"placement" = '${esc(placementWanted)}'`);
    }
    if (categoryId && cols.has('categoryId')) {
      whereParts.push(`"categoryId" = ${Number(categoryId)}`);
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const orderSql = cols.has('sortOrder')
      ? `"sortOrder" ASC NULLS FIRST, id ASC`
      : `id ASC`;

    const sql = `
      SELECT ${select.join(', ')}
      FROM ${tbl}
      ${whereSql}
      ORDER BY ${orderSql}
    `;

    const rows: any[] = await prisma.$queryRawUnsafe(sql);

    const items = rows
      .map((b) => {
        const key: string | null = b.imageKey ?? null;
        const imageUrl: string | null = b.imageUrl ?? null;
        const urlOut = key ? publicR2Url(key) : imageUrl ?? '';
        const linkOut = b.linkUrl ?? b.link ?? null;

        return {
          id: b.id,
          title: b.title ?? '',
          url: urlOut,
          linkUrl: linkOut,
          placement: b.placement ?? null,
          categoryId: b.categoryId ?? null,
          sortOrder: b.sortOrder ?? 0,
        };
      })
      .filter((x) => !!x.url);

    const payload: any = { ok: true, items };
    if (dbg) payload.debug = { select, whereParts, sql };
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('[public/banners] error:', e);
    return NextResponse.json({ ok: true, items: [] });
  }
}
