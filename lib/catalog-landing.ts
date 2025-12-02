// lib/catalog-landing.ts
import { createPrisma } from "@/lib/prisma-edge";
import { publicR2Url } from "@/lib/storage";

const prisma = createPrisma();

type ProductImageRow = { key: string | null; url: string | null };

export type ProductLiteRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null;
  imageUrl: string | null;
  // Añadimos estas dos para compatibilidad con la card de oferta, 
  // aunque el catálogo ligero no las use, la card las puede esperar
  originalPrice?: number | null; 
  appliedOffer?: any | null;
};

/**
 * Catálogo liviano para la landing.
 * Acepta opcionalmente un array de IDs para obtener SÓLO esos productos (ALTA PERFORMANCE).
 * Si se pasan IDs, se ignora perPage.
 */
export async function getLandingCatalog(
  perPage = 48,
  productIds?: number[] // <--- Argumento NUEVO
): Promise<ProductLiteRow[]> {
  
  // Condición WHERE dinámica
  let whereClause: any = {
    // Puedes ajustar este filtro si quieres excluir borradores, etc.
    // status: "ACTIVE" as any, 
  } as any;
  
  // CLAVE: Si se pasa una lista de IDs, filtramos por ellos
  if (productIds && productIds.length > 0) {
    whereClause = {
      ...whereClause,
      id: { in: productIds },
    };
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: { id: "desc" },
    // Si filtramos por IDs, no necesitamos el 'take' (ya es selectivo)
    take: productIds && productIds.length > 0 ? undefined : perPage, 
    include: {
      images: { select: { key: true, url: true } },
      // Añade aquí cualquier otra inclusión que necesites para la ProductCard
      // ejemplo: variants, si la card necesita saber si el producto tiene variantes
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
      price: (p as any).price ?? null, // Price base, no final
      imageUrl,
      // Los campos originalPrice/appliedOffer/offer serán null o undefined
      // si el catálogo es lite, PERO la lógica de page.tsx ya no usará este catálogo
      // para las ofertas, así que esto es solo un contenedor seguro.
    };
  });
}