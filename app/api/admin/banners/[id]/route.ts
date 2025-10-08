// app/api/admin/banners/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';
import { r2List, r2Delete } from '@/lib/storage'; // 🧹 limpiar objetos en R2

const prisma = createPrisma();

/* ───────── helpers ───────── */
async function readId(ctx: any): Promise<number | null> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const n = Number(obj?.id);
  return Number.isFinite(n) ? n : null;
}

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

const PUB_R2 =
  (process.env.PUBLIC_R2_BASE_URL || process.env.NEXT_PUBLIC_R2_BASE_URL || '').replace(/\/+$/, '');

function keyFromPublicUrl(url?: string | null): string | null {
  const u = (url || '').trim();
  if (!u || !PUB_R2) return null;
  const base = PUB_R2 + '/';
  return u.startsWith(base) ? u.slice(base.length) : null;
}

/* ───────── GET por id ───────── */
export async function GET(_req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
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
  else if (cols.has('"order"'.replace(/"/g, ''))) sel.push(`"order" AS "sortOrder"`);
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

/* ───────── PUT (update) ───────── */
export async function PUT(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
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
  if (
    typeof body.link === 'string' ||
    body.link === null ||
    typeof body.linkUrl === 'string' ||
    body.linkUrl === null
  ) {
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

  await audit(req, 'banner.update', 'banner', String(id), { sets }).catch(() => {});
  return NextResponse.json({ ok: true, item });
}

/* ───────── DELETE (limpia R2 y borra fila) ───────── */
export async function DELETE(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'ID inválido' }, { status: 400 });
  }

  try {
    const tbl = await getBannerTableName();
    const cols = await getBannerColumns(tbl);

    // 1) Intentar obtener posibles claves para borrar en R2
    const selKeyParts: string[] = ['id'];
    if (cols.has('imageKey')) selKeyParts.push(`"imageKey"`);
    if (cols.has('r2Key')) selKeyParts.push(`"r2Key"`);
    if (cols.has('imageUrl')) selKeyParts.push(`"imageUrl"`);
    else if (cols.has('image')) selKeyParts.push(`"image" AS "imageUrl"`);

    const rowSql = `
      SELECT ${selKeyParts.join(', ')}
      FROM ${tbl}
      WHERE id=${id}
      LIMIT 1
    `;
    const found: any[] = await prisma.$queryRawUnsafe(rowSql);
    const row = found?.[0];

    // 2) Borrar por imageKey/r2Key directo
    const keysToTry = new Set<string>();
    if (row?.imageKey && typeof row.imageKey === 'string') keysToTry.add(row.imageKey);
    if (row?.r2Key && typeof row.r2Key === 'string') keysToTry.add(row.r2Key);

    // 3) Si el imageUrl apunta al bucket público, derivar key
    const maybeKey = keyFromPublicUrl(row?.imageUrl);
    if (maybeKey) keysToTry.add(maybeKey);

    for (const k of keysToTry) {
      try {
        await r2Delete(k);
      } catch {
        // best-effort
      }
    }

    // 4) Además, limpiar cualquier archivo bajo prefixes comunes
    for (const prefix of [`banners/${id}/`, `banner/${id}/`]) {
      try {
        const objs = await r2List(prefix);
        for (const o of objs) {
          try {
            await r2Delete(o.key);
          } catch {}
        }
      } catch {}
    }

    // 5) Borrar fila
    const sql = `DELETE FROM ${tbl} WHERE id=${id}`;
    await prisma.$queryRawUnsafe(sql);

    await audit(req, 'banner.delete', 'banner', String(id)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
