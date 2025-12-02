// lib/catalog-landing.ts

import { PrismaClient, ProductStatus } from "@prisma/client/edge"; 
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
          take: 1, 
          orderBy: { id: "asc" }, 
        },
      },
      where: {
        id: productIds?.length ? { in: productIds } : undefined,
        // Filtro de estado para productos activos (última corrección)
        status: { equals: ProductStatus.ACTIVE }, 
      },
      take: productIds?.length ? undefined : (perPage > 0 ? perPage : undefined),
      // Ordenamiento por ID (última corrección para evitar el error 'position')
      orderBy: { id: "asc" },
    });

    const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

    // BLOQUE DE DIAGNÓSTICO TEMPORAL: VERIFICAR DATOS
    console.log("DIAGNÓSTICO INICIADO:");
    console.log("PUBLIC_R2_BASE_URL:", publicR2Url);
    console.log("Primeros 5 productos con datos clave:");
    items.slice(0, 5).forEach((p, index) => {
        console.log(`- Producto ${index + 1} (ID: ${p.id}, Nombre: ${p.name}):`);
        console.log(`  > Precio: ${p.price}`);
        console.log(`  > Imagen URL Raw: ${p.images[0]?.url ?? 'N/A'}`);
    });
    console.log("DIAGNÓSTICO FINALIZADO.");
    // FIN BLOQUE DE DIAGNÓSTICO
    
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