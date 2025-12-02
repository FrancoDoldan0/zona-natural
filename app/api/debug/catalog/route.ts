// app/api/debug/catalog/route.ts

import { getLandingCatalog } from "@/lib/catalog-landing";
import { NextResponse } from "next/server";

// Define que esta ruta se ejecute en el Edge Runtime (como Pages)
export const runtime = "edge";

export async function GET() {
    try {
        // Obtenemos los primeros 5 productos (cambiamos perPage a 5)
        const items = await getLandingCatalog(5); 

        const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

        // Mapeamos y extraemos solo los datos clave de los primeros 5 productos
        const debugData = items.map((p) => {
            
            // 🔑 CORRECCIÓN: Extraer la clave (key) directamente de la relación 'images'
            // Esto confirma que la consulta a Prisma en getLandingCatalog funcionó.
            const rawKey = p.images?.length > 0 && p.images[0]?.key 
                ? p.images[0].key 
                : 'N/A';
            
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                finalImageUrl: p.imageUrl, // URL final generada
                rawUrlComponent: rawKey, // <-- Usamos la clave directa
                status: p.status,
            };
        });
        
        return NextResponse.json({
            status: "success",
            r2BaseUrl: publicR2Url,
            productCount: items.length,
            products: debugData,
        }, { status: 200 });
        
    } catch (error) {
        console.error("Error fetching debug catalog:", error);
        return NextResponse.json({ status: "error", message: error instanceof Error ? error.message : "An unknown error occurred" }, { status: 500 });
    }
}