// app/api/admin/banners/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

// ───────── helpers de Next 15 ─────────
function readId(ctx: any): number | null {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? undefined : p;
  if (obj && obj.id != null) return Number(obj.id);
  return null;
}

// ───────── helpers SQL dinámico ─────────
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

type BannerStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

function normalizeStatus(row: any): BannerStatus {
  if (typeof row?.status === 'string') return row.status as BannerStatus;
  const act =
    typeof row?.isActive === 'boolean'
      ? row.isActive
      : typeof row?.active === 'boolean'
      ? row.active
      : true;
  return act ? 'ACTIVE' : 'INACTIVE';
}

function desiredStatusFromBody(body: any): BannerStatus | undefined {
  if (typeof body?.status === 'string') return body.status as BannerStatus;
  if (typeof body?.isActive === 'boolean') return body.isActive ? 'ACTIVE' : 'INACTIVE';
  if (typeof body?.active === 'boolean') return body.active ? 'ACTIVE' : 'INACTIVE';
  return undefined;
}

// ───────── GET por id (opcional y robusto) ─────────
export async function GET(_req: Request, ctx: any) {
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const tbl = await getBannerTableName();
  const cols = await getBannerColumns(tbl);

  const sel: string[] = ['id', `"title"`];

  if (cols.has('imageUrl')) sel.push(`"imageUrl"`);
  else if (cols.has('image')) sel.push(`"image" AS "imageUrl"`);
  else sel.push(`NULL AS "imageUrl"`);

  if (cols.has('linkUrl')) sel.push(`"linkUrl"`);
  else if (cols.has('link')) sel.push(`"link" AS "linkUrl"`);
  else sel.push(`NULL AS "linkUrl"`);

  if (cols.has('sortOrder')) sel.push(`"sortOrder"`);
  else if (cols.has('order')) sel.push(`"order" AS "sortOrder"`);
  else sel.push(`0 AS "sortOrder"`);

  if (cols.has('status')) sel.push(`"status"`);
  if (cols.has('isActive')) sel.push(`"isActive"`);
  if (cols.has('active')) sel.push(`"active"`);

  const sql = `
    SELECT ${sel.join(', ')}
    FROM ${tbl}
    WHERE id=${id}
    LIMIT 1
  `;
  const rows: any[] = await prisma.$queryRawUnsafe(sql);
  const r = rows?.[0];

  if (!r) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });

  const item = {
    id: r.id,
    title: r.title ?? '',
    imageUrl: r.imageUrl ?? '',
    link: r.linkUrl ?? null,
    sortOrder: r.sortOrder ?? 0,
    status: normalizeStatus(r),
    isActive: typeof r.isActive === 'boolean' ? r.isActive : undefined,
    active: typeof r.active === 'boolean' ? r.active : undefined,
  };

  return NextResponse.json({ ok: true, item });
}

// ───────── PUT (update/toggle) robusto ─────────
export async function PUT(req: Request, ctx: any) {
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as any;

  const tbl = await getBannerTableName();
  const cols = await getBannerColumns(tbl);

  const sets: string[] = [];

  // Título
  if (typeof body.title === 'string') {
    sets.push(`"title"='${esc(body.title.trim())}'`);
  }

  // Imagen
  if (typeof body.imageUrl === 'string') {
    const v = body.imageUrl.trim();
    if (cols.has('imageUrl')) sets.push(`"imageUrl"='${esc(v)}'`);
    else if (cols.has('image')) sets.push(`"image"='${esc(v)}'`);
  }

  // Link (linkUrl / link)
  if (typeof body.link === 'string' || body.link === null || typeof body.linkUrl === 'string' || body.linkUrl === null) {
    const val =
      typeof body.linkUrl === 'string' && body.linkUrl.trim()
        ? body.linkUrl.trim()
        : typeof body.link === 'string' && body.link.trim()
        ? body.link.trim()
        : null;

    if (val !== null) {
      if (cols.has('linkUrl')) sets.push(`"linkUrl"='${esc(val)}'`);
      else if (cols.has('link')) sets.push(`"link"='${esc(val)}'`);
    } else {
      if (cols.has('linkUrl')) sets.push(`"linkUrl"=NULL`);
      else if (cols.has('link')) sets.push(`"link"=NULL`);
    }
  }

  // Orden (sortOrder / order)
  if (typeof body.sortOrder === 'number') {
    if (cols.has('sortOrder')) sets.push(`"sortOrder"=${body.sortOrder}`);
    else if (cols.has('order')) sets.push(`"order"=${body.sortOrder}`);
  }

  // Estado (status / isActive / active)
  const wantStatus = desiredStatusFromBody(body);
  if (wantStatus) {
    if (cols.has('status')) {
      sets.push(`"status"='${wantStatus}'`);
    } else if (cols.has('isActive')) {
      sets.push(`"isActive"=${wantStatus === 'ACTIVE' ? 'TRUE' : 'FALSE'}`);
    } else if (cols.has('active')) {
      sets.push(`"active"=${wantStatus === 'ACTIVE' ? 'TRUE' : 'FALSE'}`);
    }
  }

  // updatedAt si existe
  if (cols.has('updatedAt')) sets.push(`"updatedAt"=CURRENT_TIMESTAMP`);

  if (!sets.length) {
    return NextResponse.json({ ok: false, error: 'Sin cambios' }, { status: 400 });
  }

  const sqlUpdate = `
    UPDATE ${tbl}
    SET ${sets.join(', ')}
    WHERE id=${id}
    RETURNING id
  `;
  const upd: any[] = await prisma.$queryRawUnsafe(sqlUpdate);
  if (!upd?.length) {
    return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 });
  }

  // Selección normalizada para devolver a la UI
  const sel: string[] = ['id', `"title"`];
  if (cols.has('imageUrl')) sel.push(`"imageUrl"`);
  else if (cols.has('image')) sel.push(`"image" AS "imageUrl"`);
  else sel.push(`NULL AS "imageUrl"`);

  if (cols.has('linkUrl')) sel.push(`"linkUrl"`);
  else if (cols.has('link')) sel.push(`"link" AS "linkUrl"`);
  else sel.push(`NULL AS "linkUrl"`);

  if (cols.has('sortOrder')) sel.push(`"sortOrder"`);
  else if (cols.has('order')) sel.push(`"order" AS "sortOrder"`);
  else sel.push(`0 AS "sortOrder"`);

  if (cols.has('status')) sel.push(`"status"`);
  if (cols.has('isActive')) sel.push(`"isActive"`);
  if (cols.has('active')) sel.push(`"active"`);

  const sqlSelect = `
    SELECT ${sel.join(', ')}
    FROM ${tbl}
    WHERE id=${id}
    LIMIT 1
  `;
  const rows: any[] = await prisma.$queryRawUnsafe(sqlSelect);
  const r = rows?.[0];

  const item = r
    ? {
        id: r.id,
        title: r.title ?? '',
        imageUrl: r.imageUrl ?? '',
        link: r.linkUrl ?? null,
        sortOrder: r.sortOrder ?? 0,
        status: normalizeStatus(r),
        isActive: typeof r.isActive === 'boolean' ? r.isActive : undefined,
        active: typeof r.active === 'boolean' ? r.active : undefined,
      }
    : null;

  // audit
  await audit(req, 'banner.update', 'banner', String(id), { sets });

  return NextResponse.json({ ok: true, item });
}

// ───────── DELETE robusto ─────────
export async function DELETE(req: Request, ctx: any) {
  let id = readId(ctx);
  if (id == null && typeof ctx?.params?.then === 'function') {
    const resolved = await ctx.params;
    id = Number(resolved?.id);
  }
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  const tbl = await getBannerTableName();
  const sql = `DELETE FROM ${tbl} WHERE id=${id}`;
  await prisma.$queryRawUnsafe(sql);

  await audit(req, 'banner.delete', 'banner', String(id));

  return NextResponse.json({ ok: true });
}
