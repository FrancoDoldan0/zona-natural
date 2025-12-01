// lib/catalog-landing.ts
import { createPrisma } from "@/lib/prisma-edge";
import { publicR2Url } from "@/lib/storage";

const prisma = createPrisma();

type ProductImageRow = { key: string | null; url: string | null };

type ProductLiteRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null;
  imageUrl: string | null;
};

/**
 * Catálogo liviano para la landing:
 * - NO usa /api/public/catalogo
 * - NO hace computePricesBatch ni r2List
 * - Toma los últimos productos (simulación de "más vendidos" / destacados)
 * - Devuelve directamente imageUrl lista para usar en la UI
 */
export async function getLandingCatalog(
  perPage = 48
): Promise<ProductLiteRow[]> {
  const products = await prisma.product.findMany({
    where: {
      // Podés ajustar este filtro si querés excluir borradores, etc.
      // status: "ACTIVE" as any,
    } as any,
    orderBy: { id: "desc" },
    take: perPage,
    include: {
      images: { select: { key: true, url: true } },
    },
  });

  return products.map((p) => {
    const imgs = (p as any).images as ProductImageRow[] | undefined;
    const first = Array.isArray(imgs) ? imgs[0] : undefined;

    let imageUrl: string | null = null;
    if (first) {
      if (first.url) {
        imageUrl = first.url;
      } else if (first.key) {
        imageUrl = publicR2Url(first.key);
      }
    }

    return {
      id: p.id,
      name: p.name,
      slug: (p as any).slug,
      status: (p as any).status ?? null,
      price: (p as any).price ?? null,
      imageUrl,
    };
  });
}
