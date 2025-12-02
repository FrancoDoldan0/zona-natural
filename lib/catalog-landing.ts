// lib/catalog-landing.ts

import { PrismaClient, ProductStatus } from "@prisma/client/edge"; 
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient().$extends(withAccelerate());

// 🟢 Tipos auxiliares necesarios para el select/include
type ProductImageRow = { key: string | null };

type ProductVariantRow = {
    price: number | null;
    priceOriginal: number | null;
};

// 🔴 El tipo ProductLiteRow debe incluir las relaciones para el mapeo
export type ProductLiteRow = {
    id: number;
    name: string;
    slug: string;
    status: string | null;
    price: number | null; 
    imageUrl: string | null;
    // Añadimos los tipos de relaciones para que TypeScript no falle
    images: ProductImageRow[];
    variants: ProductVariantRow[];
};

export async function getLandingCatalog(
    perPage: number = 200,
    productIds?: number[]
): Promise<ProductLiteRow[]> {
    try {
        // Utilizamos 'select' con las relaciones anidadas para mantener la consulta ligera
        const itemsRaw = await prisma.product.findMany({
            // ❌ LÍNEA ELIMINADA/COMENTADA: Esto desactiva la caché de Prisma para forzar una consulta fresca
            // cacheStrategy: { ttl: 60 }, 

            select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                price: true,
                
                // 🔑 CORRECCIÓN 1: Usar 'key' en lugar de 'url' para R2
                images: { 
                    select: { key: true }, // La clave del archivo en R2
                    take: 1, 
                    orderBy: { id: "asc" }, 
                },
                
                // 🔑 CORRECCIÓN 2: Incluir variantes para el cálculo correcto de precios
                variants: { 
                    where: { active: true },
                    orderBy: { sortOrder: 'asc' },
                    select: { price: true, priceOriginal: true }
                }
            },
            where: {
                id: productIds?.length ? { in: productIds } : undefined,
                // El log de error en el deploy anterior decía que 'published' no era un ProductStatus válido.
                // Asumimos que quieres solo los productos que están activos.
                status: { equals: ProductStatus.ACTIVE }, 
            },
            take: productIds?.length ? undefined : (perPage > 0 ? perPage : undefined),
            orderBy: { id: "asc" },
        });
        
        // El casting es necesario para unificar el tipo al final
        const items = itemsRaw as ProductLiteRow[];

        const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

        return items.map((p) => {
            // 🔑 CORRECCIÓN 3: Usar 'key' en el mapeo en lugar de 'url'
            const rawKey = p.images[0]?.key ?? null;
            let imageUrl: string | null = null;
            
            if (rawKey && publicR2Url) {
                imageUrl = `${publicR2Url.replace(/\/+$/, "")}/${rawKey.replace(
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
                images: p.images,
                variants: p.variants,
            } as ProductLiteRow;
        });
    } catch (error) {
        console.error("Error fetching landing catalog:", error);
        return [];
    }
}