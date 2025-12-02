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
            const rawUrl = p.imageUrl ? p.imageUrl.split('/').pop() : 'N/A'; // Intentamos aislar la URL cruda original
            
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                finalImageUrl: p.imageUrl, // URL final generada
                rawUrlComponent: rawUrl, // Componente de la URL de la base de datos (clave)
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