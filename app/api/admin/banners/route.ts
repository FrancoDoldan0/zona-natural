// app/api/admin/banners/route.ts
export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';

const prisma = createPrisma();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
async function getBannerColumns(): Promise<Set<string>> {
  // Detecta columnas realmente existentes en la tabla (case sensitive).
  // Soporta "Banner" (con mayúscula) y banner (por si alguna vez se migró).
  const rows: Array<{ column_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT "column_name"
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND (table_name = 'Banner' OR lower(table_name) = 'banner');
  `);
  return new Set(rows.map((r) => r.column_name));
}

function esc(s: string) {
  // escape básico de comillas simples para SQL concatenado
  return s.replace(/'/g, "''");
}

// Zod: aceptamos campos "legacy" y nuevos
const schema = z.object({
  title: z.string().min(1),
  imageUrl: z.string().url(),                          // usamos imageUrl (no imageKey)

  linkUrl: z.string().url().optional().nullable(),     // nuevo
  link: z.string().url().optional().nullable(),        // legacy

  isActive: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),

  sortOrder: z.coerce.number().int().min(0).optional(),

  placement: z.enum(['HOME', 'PRODUCTS', 'CATEGORY', 'CHECKOUT']).optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),

  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

// ─────────────────────────────────────────────────────────────
// GET: listado para el panel (solo columnas seguras)
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const cols = await getBannerColumns();
    const url = new URL(req.url);
    const all = url.searchParams.get('all') === '1';

    const selectParts: string[] = [];
    // mínimos seguros
    selectParts.push(`id`, `"title"`, `"imageUrl"`);
    if (cols.has('link')) selectParts.push(`"link"`);
    if (cols.has('linkUrl')) selectParts.push(`"linkUrl"`);
    if (cols.has('placement')) selectParts.push(`"placement"`);
    if (cols.has('categoryId')) selectParts.push(`"categoryId"`);
    if (cols.has('sortOrder')) selectParts.push(`"sortOrder"`);
    if (cols.has('isActive')) selectParts.push(`"isActive"`);
    else if (cols.has('active')) selectParts.push(`"active"`);
    if (cols.has('startAt')) selectParts.push(`"startAt"`);
    if (cols.has('endAt')) selectParts.push(`"endAt"`);

    const where =
      all
        ? ''
        : cols.has('isActive')
        ? `WHERE "isActive" = TRUE`
        : cols.has('active')
        ? `WHERE "active" = TRUE`
        : '';

    const order =
      cols.has('sortOrder')
        ? `"sortOrder" ASC NULLS FIRST, id ASC`
        : `id ASC`;

    const sql = `
      SELECT ${selectParts.join(', ')}
      FROM "Banner"
      ${where}
      ORDER BY ${order}
    `;

    const rows: any[] = await prisma.$queryRawUnsafe(sql);

    // Normalizamos salida: linkOut
    const items = rows.map((r) => ({
      id: r.id,
      title: r.title ?? '',
      imageUrl: r.imageUrl ?? '',
      link: r.link ?? r.linkUrl ?? null,
      placement: r.placement ?? null,
      categoryId: r.categoryId ?? null,
      sortOrder: r.sortOrder ?? 0,
      isActive: typeof r.isActive === 'boolean' ? r.isActive
               : typeof r.active === 'boolean' ? r.active
               : true,
      startAt: r.startAt ?? null,
      endAt: r.endAt ?? null,
    }));

    return NextResponse.json({ ok: true, items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[admin/banners GET] error:', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST: creación tolerante (inserta solo columnas existentes)
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const cols = await getBannerColumns();

    // Datos base
    const title = body.title.trim();
    const imageUrl = body.imageUrl.trim();

    // link/linkUrl (opcional)
    const linkVal =
      (typeof body.linkUrl === 'string' && body.linkUrl.trim()) ? body.linkUrl.trim()
    : (typeof body.link === 'string' && body.link.trim())       ? body.link.trim()
    : null;

    // activo por defecto true si no viene nada
    const activeBool =
      typeof body.isActive === 'boolean' ? body.isActive
    : typeof body.active === 'boolean'   ? body.active
    : true;

    // armamos columnas/valores dinámicos según existan en DB
    const colNames: string[] = [];
    const values: string[] = [];

    // obligatorias
    colNames.push(`"title"`);   values.push(`'${esc(title)}'`);
    colNames.push(`"imageUrl"`); values.push(`'${esc(imageUrl)}'`);

    // link / linkUrl si existe el campo correspondiente
    if (linkVal) {
      if (cols.has('linkUrl')) {
        colNames.push(`"linkUrl"`); values.push(`'${esc(linkVal)}'`);
      } else if (cols.has('link')) {
        colNames.push(`"link"`); values.push(`'${esc(linkVal)}'`);
      }
    }

    // isActive / active
    if (cols.has('isActive')) {
      colNames.push(`"isActive"`); values.push(activeBool ? 'TRUE' : 'FALSE');
    } else if (cols.has('active')) {
      colNames.push(`"active"`); values.push(activeBool ? 'TRUE' : 'FALSE');
    }

    // sortOrder
    if (typeof body.sortOrder === 'number' && cols.has('sortOrder')) {
      colNames.push(`"sortOrder"`); values.push(String(body.sortOrder));
    }

    // placement
    if (body.placement && cols.has('placement')) {
      colNames.push(`"placement"`); values.push(`'${body.placement}'`);
    }

    // categoryId
    if (cols.has('categoryId') && (body.categoryId ?? null) !== null) {
      colNames.push(`"categoryId"`); values.push(String(body.categoryId));
    }

    // startAt / endAt
    if (cols.has('startAt') && body.startAt) {
      colNames.push(`"startAt"`); values.push(`'${body.startAt.toISOString()}'`);
    }
    if (cols.has('endAt') && body.endAt) {
      colNames.push(`"endAt"`); values.push(`'${body.endAt.toISOString()}'`);
    }

    // Seguridad: al menos title+imageUrl
    if (colNames.length < 2) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }

    const sql = `
      INSERT INTO "Banner" (${colNames.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING id
    `;

    const created: any[] = await prisma.$queryRawUnsafe(sql);
    const id = Number(created?.[0]?.id ?? 0);

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    if (e?.issues) {
      // error de validación Zod
      return NextResponse.json(
        { ok: false, error: 'bad_request', issues: e.issues },
        { status: 400 },
      );
    }
    console.error('[admin/banners POST] error:', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
