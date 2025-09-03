import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const runtime = 'edge';

type ReorderBody = { desiredIds: (string | number)[] };

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    // productId viene por ruta -> a número
    const productId = Number(ctx.params.id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: 'productId inválido' }, { status: 400 });
    }

    const body = (await req.json()) as ReorderBody;
    const desiredIdsRaw = Array.isArray(body?.desiredIds) ? body.desiredIds : [];

    // Normalizamos a números y descartamos valores no válidos
    const desiredIds = desiredIdsRaw
      .map((v) => Number(v))
      .filter((v): v is number => Number.isFinite(v));

    // Traer imágenes actuales del producto, ordenadas por sortOrder
    const existing = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true },
    });
    // existing: { id: number }[]

    // Validar que todos los IDs pedidos pertenecen al producto
    const included = desiredIds.map((id) => {
      const img = existing.find((x) => x.id === id);
      if (!img) throw new Error(`La imagen ${id} no pertenece al producto o no existe`);
      return img;
    });

    // Mantener el resto al final
    const remainder = existing.filter((x) => !desiredIds.includes(x.id));
    const final = [...included, ...remainder];

    // Persistir nuevo orden 0..n en sortOrder
    await prisma.$transaction(
      final.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { sortOrder: index },
        })
      )
    );

    await audit('product_images.reorder', {
      productId,
      desiredIds,
      sortField: 'sortOrder',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
