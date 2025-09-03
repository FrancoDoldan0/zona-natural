import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const runtime = 'edge';

type ReorderBody = {
  desiredIds: string[]; // IDs en el orden deseado
};

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    const productId = ctx.params.id;

    const body = (await req.json()) as ReorderBody;
    const desiredIds: string[] = Array.isArray(body?.desiredIds) ? body.desiredIds : [];

    // Traemos las imágenes actuales del producto
    const existing = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    // Re-armamos el orden: primero las deseadas (en ese orden), luego el resto
    const included = desiredIds.map((id: string) => {
      const img = existing.find((x) => x.id === id);
      if (!img) {
        throw new Error(`La imagen ${id} no pertenece al producto o no existe`);
      }
      return img;
    });

    const remainder = existing.filter((x) => !desiredIds.includes(x.id));
    const final = [...included, ...remainder];

    // Persistimos el orden (0..n)
    await prisma.$transaction(
      final.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { order: index },
        })
      )
    );

    // Auditoría (si la tenés implementada)
    await audit('product_images.reorder', { productId, desiredIds });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
