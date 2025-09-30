// app/api/admin/offers/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { z } from 'zod';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

/** Zod schema con soporte de destino único y validaciones */
const Body = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(500).optional().nullable(),
    discountType: z.enum(['PERCENT', 'AMOUNT']),
    discountVal: z.coerce.number().positive(),
    startAt: z.union([z.string(), z.date()]).optional().nullable(),
    endAt: z.union([z.string(), z.date()]).optional().nullable(),
    productId: z.coerce.number().optional().nullable(),
    categoryId: z.coerce.number().optional().nullable(),
    tagId: z.coerce.number().optional().nullable(), // ← soporte por tag
  })
  .superRefine((data, ctx) => {
    // A lo sumo un destino
    const targets = [data.productId, data.categoryId, data.tagId].filter(
      (v) => v !== null && v !== undefined && !Number.isNaN(v as any),
    );
    if (targets.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes elegir un único destino: producto, categoría o tag.',
        path: ['productId'],
      });
    }

    // Validación adicional para porcentajes
    if (data.discountType === 'PERCENT' && data.discountVal > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 100,
        type: 'number',
        inclusive: true,
        path: ['discountVal'],
        message: 'El porcentaje no puede superar 100.',
      });
    }
  });

function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function GET() {
  try {
    // Devolvemos array directo para no romper UI existente
    const items = await prisma.offer.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json<any>();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_failed', detail: parsed.error.format() },
        { status: 400 },
      );
    }

    const b = parsed.data;
    const created = await prisma.offer.create({
      data: {
        title: b.title,
        description: b.description ?? null,
        discountType: b.discountType,
        discountVal: b.discountVal,
        startAt: toDate(b.startAt),
        endAt: toDate(b.endAt),
        productId: b.productId ?? null,
        categoryId: b.categoryId ?? null,
        tagId: b.tagId ?? null, // ← guardar tag si viene
      },
    });

    await audit(req, 'CREATE', 'Offer', created.id, b);
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'admin_offers_post_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
