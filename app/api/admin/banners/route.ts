// app/api/admin/banners/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';

const prisma = createPrisma();

// ───────── helpers ─────────
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

// Aceptamos status estilo productos o los booleans legacy
const schema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),

  linkUrl: z.string().url().optional().nullable(),
  link: z.string().url().optional().nullable(),

  // NUEVO: status estilo productos (opcional)
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED']).optional(),

  // Compat: booleans legacy
  isActive: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),

  sortOrder: z.coerce.number().int().min(0).optional(),
  placement: z.enum(['HOME', 'PRODUCTS', 'CATEGORY', 'CHECKOUT']).optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

// ───────── GET ─────────
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const all = url.searchParams.get('all') === '1';

    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    const sel: string[] = ['id', `"title"`];

    if (cols.has('imageUrl')) sel.push(`"imageUrl"`);
    else if (cols.has('image')) sel.push(`"image" AS "imageUrl"`);
    else sel.push(`NULL AS "imageUrl"`);

    if (cols.has('linkUrl')) sel.push(`"linkUrl"`);
    else if (cols.has('link')) sel.push(`"link" AS "linkUrl"`);
    else sel.push(`NULL AS "linkUrl"`);

    if (cols.has('placement')) sel.push(`"placement"`);
    if (cols.has('categoryId')) sel.push(`"categoryId"`);
    if (cols.has('sortOrder')) sel.push(`"sortOrder"`);

    // soportar ambas y también status si existe
    if (cols.has('isActive')) sel.push(`"isActive"`);
    else if (cols.has('active')) sel.push(`"active" AS "isActive"`);
    else sel.push(`NULL AS "isActive"`);

    if (cols.has('status')) sel.push(`"status"`);

    if (cols.has('startAt')) sel.push(`"startAt"`);
    if (cols.has('endAt')) sel.push(`"endAt"`);

    const where = all
      ? ''
      : cols.has('isActive')
      ? `WHERE "isActive" = TRUE`
      : cols.has('active')
      ? `WHERE "active" = TRUE`
      : cols.has('status')
      ? `WHERE "status" = 'ACTIVE'`
      : '';

    const order = cols.has('sortOrder') ? `"sortOrder" ASC NULLS FIRST, id ASC` : `id ASC`;

    const sql = `
      SELECT ${sel.join(', ')}
      FROM ${tbl}
      ${where}
      ORDER BY ${order}
    `;
    const rows: any[] = await prisma.$queryRawUnsafe(sql);

    const items = rows.map((r) => {
      const statusDb: string | null = (r.status ?? null) as any;
      // normalización de "activo" para UI actual
      const isActiveNorm =
        typeof r.isActive === 'boolean' ? r.isActive :
        statusDb ? statusDb === 'ACTIVE' : true;

      return {
        id: r.id,
        title: r.title ?? '',
        imageUrl: r.imageUrl ?? '',
        link: r.linkUrl ?? null,
        placement: r.placement ?? null,
        categoryId: r.categoryId ?? null,
        sortOrder: r.sortOrder ?? 0,
        isActive: isActiveNorm,          // para la etiqueta “Activo / Inactivo”
        status: statusDb ?? (isActiveNorm ? 'ACTIVE' : 'INACTIVE'),
        startAt: r.startAt ?? null,
        endAt: r.endAt ?? null,
      };
    });

    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/banners GET] error:', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

// ───────── POST ─────────
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const referer = req.headers.get('referer') || '';
  const wantDebug = url.searchParams.get('_debug') === '1' || /\b_debug=1\b/.test(referer);

  try {
    const body = schema.parse(await req.json());

    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    const title = body.title.trim();
    const imageUrlIn = body.imageUrl.trim();

    const linkVal =
      (typeof body.linkUrl === 'string' && body.linkUrl.trim())
        ? body.linkUrl.trim()
        : (typeof body.link === 'string' && body.link.trim())
        ? body.link.trim()
        : null;

    const statusIn = body.status as
      | 'ACTIVE'
      | 'INACTIVE'
      | 'DRAFT'
      | 'ARCHIVED'
      | undefined;

    // Regla de verdad única:
    // 1) si mandan status, usamos eso;
    // 2) si no, derivamos de isActive/active;
    // 3) default: ACTIVE
    const activeBool =
      typeof body.isActive === 'boolean'
        ? body.isActive
        : typeof body.active === 'boolean'
        ? body.active
        : statusIn
        ? statusIn === 'ACTIVE'
        : true;

    const statusToWrite =
      statusIn ?? (activeBool ? 'ACTIVE' : 'INACTIVE');

    // INSERT dinámico
    const names: string[] = [`"title"`];
    const values: string[] = [`'${esc(title)}'`];

    if (cols.has('imageUrl')) {
      names.push(`"imageUrl"`);
      values.push(`'${esc(imageUrlIn)}'`);
    } else if (cols.has('image')) {
      names.push(`"image"`);
      values.push(`'${esc(imageUrlIn)}'`);
    } else {
      const msg = 'No se encontró columna imageUrl/image en la tabla Banner';
      if (wantDebug) return NextResponse.json({ ok: false, error: 'internal_error', detail: msg }, { status: 500 });
      return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
    }

    if (linkVal) {
      if (cols.has('linkUrl')) { names.push(`"linkUrl"`); values.push(`'${esc(linkVal)}'`); }
      else if (cols.has('link')) { names.push(`"link"`); values.push(`'${esc(linkVal)}'`); }
    }

    // Preferimos status si existe; si no, boolean legacy
    if (cols.has('status')) {
      names.push(`"status"`);
      values.push(`'${statusToWrite}'`);
    } else if (cols.has('isActive')) {
      names.push(`"isActive"`);
      values.push(activeBool ? 'TRUE' : 'FALSE');
    } else if (cols.has('active')) {
      names.push(`"active"`);
      values.push(activeBool ? 'TRUE' : 'FALSE');
    }

    if (typeof body.sortOrder === 'number' && cols.has('sortOrder')) {
      names.push(`"sortOrder"`);
      values.push(String(body.sortOrder));
    }
    if (body.placement && cols.has('placement')) {
      names.push(`"placement"`);
      values.push(`'${body.placement}'`);
    }
    if (cols.has('categoryId') && (body.categoryId ?? null) !== null) {
      names.push(`"categoryId"`);
      values.push(String(body.categoryId));
    }
    if (cols.has('startAt') && body.startAt) {
      names.push(`"startAt"`);
      values.push(`'${body.startAt.toISOString()}'`);
    }
    if (cols.has('endAt') && body.endAt) {
      names.push(`"endAt"`);
      values.push(`'${body.endAt.toISOString()}'`);
    }

    const nowIso = new Date().toISOString();
    if (cols.has('createdAt')) { names.push(`"createdAt"`); values.push(`'${nowIso}'`); }
    if (cols.has('updatedAt')) { names.push(`"updatedAt"`); values.push(`'${nowIso}'`); }

    const sql = `
      INSERT INTO ${tbl} (${names.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING id
    `;
    const created: any[] = await prisma.$queryRawUnsafe(sql);

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
