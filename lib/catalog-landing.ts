// lib/catalog-landing.ts
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

// 💡 Cliente Prisma con Accelerate (usa el cache de Cloudflare)
const prisma = new PrismaClient().$extends(withAccelerate());

// 💡 Tipo de datos que devuelve la consulta ligera
export type ProductLiteRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null; // <-- Precio base (sin ofertas)
  imageUrl: string | null; // <-- URL de la imagen de R2
};

/**
 * Función optimizada para cargar productos de forma ligera,
 * ideal para carruseles o grillas de catálogo sin todos los detalles.
 *
 * @param perPage El número máximo de productos a cargar (0 para infinito).
 * @param productIds Lista de IDs específicos a cargar (prioritario sobre perPage).
 * @returns Lista de objetos ProductLiteRow.
 */
export async function getLandingCatalog(
  perPage: number = 200,
  productIds?: number[]
): Promise<ProductLiteRow[]> {
  try {
    const items = await prisma.product.findMany({
      // Usa cache de 60s
      cacheStrategy: { ttl: 60 }, 
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        price: true,
        images: {
          select: {
            url: true,
            alt: true,
          },
          take: 1, // Solo la primera imagen
          orderBy: { position: "asc" },
        },
      },
      where: {
        // 🔑 FILTRADO CLAVE: Si se proporcionan IDs, filtra solo por esos.
        id: productIds?.length ? { in: productIds } : undefined,
        status: "published",
      },
      // Solo aplica take si no estamos filtrando por IDs específicos.
      take: productIds?.length ? undefined : (perPage > 0 ? perPage : undefined),
      // Ordenar por más vendidos (ejemplo) o por defecto.
      orderBy: { position: "asc" },
    });

    // Mapear el resultado para incluir la URL de R2
    const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

    return items.map((p) => {
      const rawUrl = p.images[0]?.url ?? null;
      let imageUrl: string | null = null;

      if (rawUrl && publicR2Url) {
        // Asumimos que la URL de la DB es un path relativo a R2
        imageUrl = `${publicR2Url.replace(/\/+$/, "")}/${rawUrl.replace(
          /^\/|\/+$/,
          ""
        )}`;
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        price: p.price,
        imageUrl,
      };
    });
  } catch (error) {
    console.error("Error fetching landing catalog:", error);
    return [];
  }
}