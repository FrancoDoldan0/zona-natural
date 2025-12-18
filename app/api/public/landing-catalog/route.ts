// app/api/public/landing-catalog/route.ts

import { PrismaClient, ProductStatus } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { NextResponse } from "next/server";
import { LandingProduct, mapToLandingProduct } from "@/lib/catalog-helpers";

// Usamos el mismo cliente de Prisma
const prisma = new PrismaClient().$extends(withAccelerate());

// Define que esta ruta se ejecute en el Edge Runtime
export const runtime = "edge";

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        // 🔑 Recoger IDs a cargar (p.ej. de 'Mejores Ofertas')
        // La landing page puede pasarle una lista de IDs como: /api/landing-catalog?ids=27,28,29
        const idsParam = url.searchParams.get("ids");
        const productIds = idsParam ? idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
        
        // El número de productos a mostrar si no se pasan IDs
        const perPage = 200; 

        // 🟢 Consulta robusta a Prisma con select/include
        const itemsRaw = await prisma.product.findMany({
            // Como esta API se usa en producción, puedes volver a añadir la caché si quieres:
            // cacheStrategy: { ttl: 60 }, 
            
            select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
                images: { 
                    select: { key: true }, // Obtenemos la clave de la DB
                    take: 1, 
                    orderBy: { id: "asc" }, 
                },
                variants: { 
                    where: { active: true }, // Obtenemos las variantes activas para el precio
                    orderBy: { sortOrder: 'asc' },
                    select: { price: true, priceOriginal: true, active: true }
                }
            },
            where: {
                // Filtramos por los IDs pasados y por productos ACTIVOS
                id: productIds.length > 0 ? { in: productIds } : undefined,
                status: { equals: ProductStatus.ACTIVE }, 
            },
            take: productIds.length > 0 ? undefined : (perPage > 0 ? perPage : undefined),
            orderBy: { id: "asc" },
        });
        
        const publicR2Url = process.env.PUBLIC_R2_BASE_URL;
        if (!publicR2Url) {
            throw new Error("PUBLIC_R2_BASE_URL no está definido.");
        }

        // 🧩 Mapear los datos usando el helper (aplica fallback de imagen y resuelve precio)
        const products = itemsRaw.map(p => mapToLandingProduct(p, publicR2Url));

        return NextResponse.json({
            status: "success",
            products,
        }, { status: 200 });
        
    } catch (error) {
        console.error("Error fetching landing catalog:", error);
        return NextResponse.json(
            { status: "error", message: error instanceof Error ? error.message : "An unknown error occurred" }, 
            { status: 500 }
        );
    }
}