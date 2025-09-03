import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const runtime = 'edge';

type ReorderBody = {
  desiredIds: string[];
};

// Cambia esto si querés fijarlo por env: NEXT_PUBLIC_IMG_SORT_FIELD=position, etc.
const SORT_FIELD =
  (process.env.NEXT_PUBLIC_IMG_SORT_FIELD as
    | 'order'
    | 'position'
    | 'sort'
    | 'sortOrder'
    | 'index'
    | 'idx') || 'order';

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const productIdParam = ctx.params.id;
    const productId = Number(productIdParam);
    if (!Number.isFinite(productId)) {
      return NextResponse.json(
        { ok: false, error: 'productId inválido' },
        { status: 400 }
      );
    }

    const body = (await req.json()) as ReorderBody;
    const desiredIds: string[] = Array.isArray(body?.desiredIds) ? body.desiredIds : [];

    // Traer imágenes actuales; si el campo no existe, no ordenamos (queda por PK)
    const existing = await prisma.productImage.findMany({
      where: { productId },
      // usamos any para no depender del nombre exacto del campo en el tipo generado por Prisma
      ...(SORT_FIELD ? ({ orderBy: { [SORT_FIELD]: 'asc' } } as any) : {}),
      select: { id: true },
    });

    // Validar que todas las deseadas pertenecen al producto
    const included = desiredIds.map((id: string) => {
      const img = existing.find((x) => x.id === id);
      if (!img) throw new Error(`La imagen ${id} no pertenece al producto o no existe`);
      return img;
    });

    const remainder = existing.filter((x) => !desiredIds.includes(x.id));
    const final = [...included, ...remainder];

    // Persistir orden 0..n en el campo configurado
    await prisma.$transaction(
      final.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { [SORT_FIELD]: index } as any, // <- agnóstico
        })
      )
    );

    await audit('product_images.reorder', { productId, desiredIds, sortField: SORT_FIELD });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
