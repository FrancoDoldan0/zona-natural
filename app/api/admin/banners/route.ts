export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';

const prisma = createPrisma();

// Acepta campos nuevos y legacy (link/linkUrl, active/isActive).
const schema = z.object({
  title: z.string().min(1),

  // Mantengo imageUrl requerido (tu modelo lo tiene como String no-null).
  imageUrl: z.string().url(),

  // Opcional: guardamos también la clave en R2 si viene.
  imageKey: z.string().min(1).optional(),

  // Compat: permitimos ambos nombres; mapeamos a linkUrl en DB.
  linkUrl: z.string().url().optional().nullable(),
  link: z.string().url().optional().nullable(),

  // Compat: permitimos ambos nombres; mapeamos a isActive en DB.
  isActive: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),

  sortOrder: z.coerce.number().int().min(0).optional(),

  placement: z.enum(['HOME', 'PRODUCTS', 'CATEGORY', 'CHECKOUT']).optional(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),

  // Fechas opcionales (coerce desde string o number)
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === '1';

  const items = await prisma.banner.findMany({
    where: all ? {} : { isActive: true }, // <- antes estaba active
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    const created = await prisma.banner.create({
      data: {
        title: body.title,
        imageUrl: body.imageUrl,
        imageKey: body.imageKey,

        // Compat: si viene linkUrl lo uso, si no, uso link (legacy)
        linkUrl: body.linkUrl ?? body.link ?? null,

        // Compat: si viene isActive lo uso, si no, uso active (legacy)
        isActive:
          body.isActive ?? (typeof body.active === 'boolean' ? body.active : true),

        sortOrder: body.sortOrder ?? 0,

        // Nuevos campos; Prisma aplica default(HOME) si no vienen
        placement: body.placement,
        categoryId: body.categoryId ?? null,
        startAt: body.startAt ?? null,
        endAt: body.endAt ?? null,
      },
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (e: any) {
    // Errores de validación Zod
    if (e?.issues) {
      return NextResponse.json(
        { ok: false, error: 'Datos inválidos', issues: e.issues },
        { status: 400 },
      );
    }
    // Errores Prisma u otros
    return NextResponse.json(
      { ok: false, error: 'Error interno al crear banner' },
      { status: 500 },
    );
  }
}
