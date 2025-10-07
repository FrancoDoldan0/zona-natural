// app/api/admin/categories/[id]/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { createPrisma } from '@/lib/prisma-edge';
import { audit } from '@/lib/audit';
import { r2List, r2Delete } from '@/lib/storage';

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

  try {
    const item = await prisma.category.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'fetch_failed', detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    const body = await req.json<any>().catch(() => ({} as any));
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name.trim();
    if (typeof body.slug === 'string') data.slug = body.slug.trim();

    const item = await prisma.category.update({ where: { id }, data });
    await audit(req, 'category.update', 'category', String(id), { data }).catch(() => {});
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'update_failed', detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, ctx: any) {
  const id = await readId(ctx);
  if (id == null) {
    return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
  }

  try {
    // 1) Buscar subcategorías para desasociar productos por subcategoryId
    const subcats = await prisma.subcategory.findMany({
      where: { categoryId: id },
      select: { id: true },
    });
    const subcatIds = subcats.map((s) => s.id);

    // 2) Transacción: desasociar/borrar dependencias y borrar la categoría
    await prisma.$transaction(async (tx) => {
      // Desasocio productos que referencian esta categoría
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });

      // Desasocio productos que refieren a subcategorías de esta categoría
      if (subcatIds.length) {
        await tx.product.updateMany({
          where: { subcategoryId: { in: subcatIds } },
          data: { subcategoryId: null },
        });
      }

      // Elimino ofertas que apuntan a esta categoría
      await tx.offer.deleteMany({ where: { categoryId: id } });

      // Desasocio banners que apuntan a esta categoría
      await tx.banner.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });

      // Elimino subcategorías de la categoría
      await tx.subcategory.deleteMany({ where: { categoryId: id } });

      // Finalmente, elimino la categoría
      await tx.category.delete({ where: { id } });
    });

    // 3) Limpieza en R2: borro objetos bajo categories/{id}/
    try {
      const prefix = `categories/${id}/`;
      const objs = await r2List(prefix).catch(() => []);
      await Promise.all(
        (objs || []).map((o: any) =>
          r2Delete(o.key).catch(() => {
            /* ignore */
          })
        )
      );
    } catch {
      // No bloquea el borrado
    }

    await audit(req, 'category.delete', 'category', String(id), {
      subcatCount: subcatIds.length,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // Siempre devolvemos JSON para que el front no intente parsear HTML
    return NextResponse.json(
      { ok: false, error: 'delete_failed', detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
