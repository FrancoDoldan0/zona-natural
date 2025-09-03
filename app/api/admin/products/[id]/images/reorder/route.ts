import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

export const runtime = 'edge';

type ReorderBody = {
  desiredIds: string[]; // ids de imágenes en el orden deseado
};

export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  try {
    // ⚠ params.id viene como string; en Prisma productId es number
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

    // Imágenes actuales del producto
    const existing = await prisma.productImage.findMany({
      where: { productId },              // <- ahora es number
      orderBy: { order: 'asc' },
      select: { id: true },
    });

    // Re-armar orden: primero las deseadas (en ese orden), luego el resto
    const included = desiredIds.map((id: string) => {
      const img = existing.find((x) => x.id === id);
      if (!img) {
        throw new Error(`La imagen ${id} no pertenece al producto o no existe`);
      }
      return img;
    });

    const remainder = existing.filter((x) => !desiredIds.includes(x.id));
    const final = [...included, ...remainder];

    // Persistir orden 0..n
    await prisma.$transaction(
      final.map((img, index) =>
        prisma.productImage.update({
          where: { id: img.id },
          data: { order: index },
        })
      )
    );

    await audit('product_images.reorder', { productId, desiredIds });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error inesperado';
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
