// app/api/admin/categories/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';

const prisma = createPrisma();

// Lee el id desde ctx.params (objeto o promesa en Next 15)
async function readId(ctx: any): Promise<number | null> {
  const p = ctx?.params;
  const obj = typeof p?.then === 'function' ? await p : p;
  const id = obj?.id;
  return Number.isFinite(Number(id)) ? Number(id) : null;
}

export async function GET(_req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const item = await prisma.category.findUnique({ where: { id } });
  if (!item) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  const body = await req.json<any>().catch(() => ({} as any));
  const data: any = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.slug === 'string') data.slug = body.slug.trim();

  const item = await prisma.category.update({ where: { id }, data });

  await audit(req, 'category.update', 'category', String(id), { data }).catch(() => {});

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    // 1) Desasociar productos de la categoría
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    // 2) Desasociar productos de subcategorías de esta categoría
    const subcats = await prisma.subcategory.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    const subIds = subcats.map((s) => s.id);
    if (subIds.length) {
      await prisma.product.updateMany({
        where: { subcategoryId: { in: subIds } },
        data: { subcategoryId: null },
      });
    }

    // 3) Desasociar ofertas de la categoría (si corresponde)
    await prisma.offer.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    // 4) (Best-effort) Desasociar banners si la columna existe.
    //    En tu DB actual puede NO existir; si falla, ignoramos y seguimos.
    try {
      // @ts-expect-error: puede no existir la columna en esta base
      await prisma.banner.updateMany({
        // @ts-ignore
        where: { categoryId: id },
        // @ts-ignore
        data: { categoryId: null },
      });
    } catch {
      // columna inexistente: continuar sin bloquear el borrado
    }

    // 5) Borrar subcategorías
    await prisma.subcategory.deleteMany({ where: { categoryId: id } });

    // 6) Borrar categoría
    await prisma.category.delete({ where: { id } });

    await audit(req, 'category.delete', 'category', String(id)).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // P2003 = constraint (FK) violation
    if (e?.code === 'P2003') {
      return NextResponse.json(
        { ok: false, error: 'delete_failed', detail: 'constraint_violation' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
