// lib/catalog-landing.ts
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

export type ProductLiteRow = {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  price: number | null; 
  imageUrl: string | null; 
};

export async function getLandingCatalog(
  perPage: number = 200,
  productIds?: number[]
): Promise<ProductLiteRow[]> {
  try {
    const items = await prisma.product.findMany({
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
          // 🔑 CORRECCIÓN CLAVE: Se cambió 'position' por 'id' para evitar Type error de Prisma.
          orderBy: { id: "asc" },
        },
      },
      where: {
        id: productIds?.length ? { in: productIds } : undefined,
        status: "published",
      },
      take: productIds?.length ? undefined : (perPage > 0 ? perPage : undefined),
      // Asumimos que 'position' SÍ existe en el modelo 'Product' para el orden principal.
      orderBy: { position: "asc" },
    });

    const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

    return items.map((p) => {
      const rawUrl = p.images[0]?.url ?? null;
      let imageUrl: string | null = null;

      if (rawUrl && publicR2Url) {
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