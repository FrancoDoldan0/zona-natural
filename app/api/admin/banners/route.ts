// app/api/admin/banners/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';

const prisma = createPrisma();

// ——— helpers ————————————————————————————————————————————
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
  // devolver identificador entre comillas tal cual está en el catálogo
  return `"${name}"`;
}

async function getBannerColumns(tblQuoted: string): Promise<Set<string>> {
  // quitar comillas para consultar information_schema
  const tbl = tblQuoted.replace(/^"+|"+$/g, '');
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT "column_name"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = '${esc(tbl)}'
  `);
  return new Set(rows.map((r) => r.column_name));
}

// Zod compat
const schema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),

  linkUrl: z.string().url().optional().nullable(),
  link: z.string().url().optional().nullable(),

  isActive: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),

  sortOrder: z.coerce.number().int().min(0).optional(),

  placement: z.enum(['HOME', 'PRODUCTS', 'CATEGORY', 'CHECKOUT']).optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),

  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

// ——— GET ————————————————————————————————————————————————
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const all = url.searchParams.get('all') === '1';

    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    const select: string[] = ['id', `"title"`, `"imageUrl"`];
    if (cols.has('link')) select.push(`"link"`);
    if (cols.has('linkUrl')) select.push(`"linkUrl"`);
    if (cols.has('placement')) select.push(`"placement"`);
    if (cols.has('categoryId')) select.push(`"categoryId"`);
    if (cols.has('sortOrder')) select.push(`"sortOrder"`);
    if (cols.has('isActive')) select.push(`"isActive"`);
    else if (cols.has('active')) select.push(`"active"`);
    if (cols.has('startAt')) select.push(`"startAt"`);
    if (cols.has('endAt')) select.push(`"endAt"`);

    const where = all
      ? ''
      : cols.has('isActive')
      ? `WHERE "isActive" = TRUE`
      : cols.has('active')
      ? `WHERE "active" = TRUE`
      : '';

    const order = cols.has('sortOrder') ? `"sortOrder" ASC NULLS FIRST, id ASC` : `id ASC`;

    const sql = `
      SELECT ${select.join(', ')}
      FROM ${tbl}
      ${where}
      ORDER BY ${order}
    `;
    const rows: any[] = await prisma.$queryRawUnsafe(sql);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      imageUrl: r.imageUrl ?? '',
      link: r.link ?? r.linkUrl ?? null,
      placement: r.placement ?? null,
      categoryId: r.categoryId ?? null,
      sortOrder: r.sortOrder ?? 0,
      isActive:
        typeof r.isActive === 'boolean' ? r.isActive :
        typeof r.active === 'boolean' ? r.active : true,
      startAt: r.startAt ?? null,
      endAt: r.endAt ?? null,
    }));

    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/banners GET] error:', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

// ——— POST ————————————————————————————————————————————————
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const referer = req.headers.get('referer') || '';
  const wantDebug = url.searchParams.get('_debug') === '1' || /\b_debug=1\b/.test(referer);

  try {
    const body = schema.parse(await req.json());

    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    const title = body.title.trim();
    const imageUrl = body.imageUrl.trim();
    const linkVal =
      (typeof body.linkUrl === 'string' && body.linkUrl.trim()) ? body.linkUrl.trim()
      : (typeof body.link === 'string' && body.link.trim()) ? body.link.trim()
      : null;
    const activeBool =
      typeof body.isActive === 'boolean' ? body.isActive
      : typeof body.active === 'boolean' ? body.active
      : true;

    // Build dinámico completo
    const names: string[] = [`"title"`, `"imageUrl"`];
    const values: string[] = [`'${esc(title)}'`, `'${esc(imageUrl)}'`];

    if (linkVal) {
      if (cols.has('linkUrl')) { names.push(`"linkUrl"`); values.push(`'${esc(linkVal)}'`); }
      else if (cols.has('link')) { names.push(`"link"`); values.push(`'${esc(linkVal)}'`); }
    }
    if (cols.has('isActive')) { names.push(`"isActive"`); values.push(activeBool ? 'TRUE' : 'FALSE'); }
    else if (cols.has('active')) { names.push(`"active"`); values.push(activeBool ? 'TRUE' : 'FALSE'); }

    if (typeof body.sortOrder === 'number' && cols.has('sortOrder')) {
      names.push(`"sortOrder"`); values.push(String(body.sortOrder));
    }
    if (body.placement && cols.has('placement')) {
      names.push(`"placement"`); values.push(`'${body.placement}'`);
    }
    if (cols.has('categoryId') && (body.categoryId ?? null) !== null) {
      names.push(`"categoryId"`); values.push(String(body.categoryId));
    }
    if (cols.has('startAt') && body.startAt) {
      names.push(`"startAt"`); values.push(`'${body.startAt.toISOString()}'`);
    }
    if (cols.has('endAt') && body.endAt) {
      names.push(`"endAt"`); values.push(`'${body.endAt.toISOString()}'`);
    }

    const sqlFull = `
      INSERT INTO ${tbl} (${names.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING id
    `;

    let created: any[];
    try {
      created = await prisma.$queryRawUnsafe(sqlFull);
    } catch (e: any) {
      // Fallback mínimo
      const minNames: string[] = [`"title"`, `"imageUrl"`];
      const minValues: string[] = [`'${esc(title)}'`, `'${esc(imageUrl)}'`];
      if (cols.has('isActive')) { minNames.push(`"isActive"`); minValues.push(activeBool ? 'TRUE' : 'FALSE'); }
      else if (cols.has('active')) { minNames.push(`"active"`); minValues.push(activeBool ? 'TRUE' : 'FALSE'); }

      const sqlMin = `
        INSERT INTO ${tbl} (${minNames.join(', ')})
        VALUES (${minValues.join(', ')})
        RETURNING id
      `;
      try {
        created = await prisma.$queryRawUnsafe(sqlMin);
      } catch (e2: any) {
        const detail = `fullErr=${String(e?.message || e)}; minErr=${String(e2?.message || e2)}`;
        if (wantDebug) {
          return NextResponse.json(
            { ok: false, error: 'internal_error', detail },
            { status: 500 }
          );
        }
        throw e2;
      }
    }

    const id = Number(created?.[0]?.id ?? 0);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    const detail = String(e?.message || e);
    console.error('[admin/banners POST] error:', detail);
    return NextResponse.json(
      wantDebug ? { ok: false, error: 'internal_error', detail } : { ok: false, error: 'internal_error' },
      { status: 500 },
    );
  }
}
