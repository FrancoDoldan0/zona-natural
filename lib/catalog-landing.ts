// lib/catalog-landing.ts
import { createPrisma } from "@/lib/prisma-edge";
import { publicR2Url } from "@/lib/storage";

const prisma = createPrisma();

type ProductImageRow = { key: string | null };

type ProductLiteRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null;
  images?: ProductImageRow[];
};

/**
 * Catálogo liviano para la landing:
 * - NO usa /api/public/catalogo
 * - NO hace computePricesBatch ni r2List
 * - Toma los últimos productos (simulación de "más vendidos" / destacados)
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
      images: { select: { key: true } },
    },
  });

  return products.map((p) => {
    const key =
      (Array.isArray(p.images) ? p.images[0]?.key : null) ?? null;
    const url = key ? publicR2Url(key) : null;

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: (p as any).status ?? null,
      price: (p as any).price ?? null,
      images: url
        ? [{ key }]
        : [],
    };
  });
}
