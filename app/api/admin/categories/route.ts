// app/api/admin/categories/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';

const prisma = createPrisma();

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// Normaliza strings: '' -> null, trim siempre
function normalizeNullableStr(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s === '' ? null : s;
}

/* GET /api/admin/categories
   - ?q=        filtra por name/slug
   - ?take=?    límite (<=200)
   - ?skip=?    offset
*/
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const take = Math.min(parseInt(url.searchParams.get('take') || '50', 10), 200);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);

  const where: any = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      skip,
      // devolvemos campos relevantes (incluye las imágenes)
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        imageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.category.count({ where }),
  ]);

  return NextResponse.json({ ok: true, items, total });
}

/* POST /api/admin/categories
   Body JSON:
   {
     name: string (requerido),
     slug?: string,
     imageUrl?: string | null,
     imageKey?: string | null
   }
*/
export async function POST(req: Request) {
  try {
    const body = await req.json<any>().catch(() => ({}));
    const name: string | undefined = typeof body?.name === 'string' ? body.name.trim() : undefined;
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });
    }

    const slug: string = body?.slug?.trim() ? slugify(body.slug) : slugify(name);

    // Normalizamos campos de imagen
    const imageUrl = normalizeNullableStr(body?.imageUrl);
    const imageKey = normalizeNullableStr(body?.imageKey);

    const item = await prisma.category.create({
      data: {
        name,
        slug,
        imageUrl,
        imageKey,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        imageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    // Slug duplicado u otras unique constraints
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'slug_taken', detail: e?.meta ?? null },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Bad request', detail: e?.message ?? String(e) },
      { status: 400 },
    );
  }
}

/* PUT /api/admin/categories?id=123
   Body JSON (parcial):
   {
     name?: string,
     slug?: string ("" -> recalcula a partir de name o actual),
     imageUrl?: string | null,
     imageKey?: string | null
   }
*/
export async function PUT(req: Request) {
  const url = new URL(req.url);
  const idRaw = url.searchParams.get('id');
  const id = Number(idRaw);
  if (!idRaw || !Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json<any>().catch(() => ({}));

    const data: any = {};

    if (typeof body?.name === 'string') {
      const n = body.name.trim();
      if (!n) return NextResponse.json({ ok: false, error: 'Nombre requerido' }, { status: 400 });
      data.name = n;
    }

    if ('slug' in body) {
      if (typeof body.slug === 'string') {
        const s = body.slug.trim();
        if (s === '') {
          // Recalcular con el nombre (nuevo o actual)
          const current = await prisma.category.findUnique({
            where: { id },
            select: { name: true },
          });
          const base = (data.name ?? current?.name ?? '').trim();
          data.slug = slugify(base || `category-${id}`);
        } else {
          data.slug = slugify(s);
        }
      }
    }

    if ('imageUrl' in body) data.imageUrl = normalizeNullableStr(body.imageUrl);
    if ('imageKey' in body) data.imageKey = normalizeNullableStr(body.imageKey);

    const item = await prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        imageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'slug_taken', detail: e?.meta ?? null },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'update_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
