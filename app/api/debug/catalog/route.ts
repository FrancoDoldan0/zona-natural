// app/api/debug/catalog/route.ts (MODIFICACIÓN TEMPORAL)

import { getLandingCatalog } from "@/lib/catalog-landing";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
    try {
        // 🔑 PRUEBA CLAVE: Forzar la carga de un ID conocido y funcional (ej: 29)
        const productIdsToTest = [29]; 
        const items = await getLandingCatalog(5, productIdsToTest); 

        const publicR2Url = process.env.PUBLIC_R2_BASE_URL;

        const debugData = items.map((p) => {
            const rawKey = p.images?.length > 0 && p.images[0]?.key 
                ? p.images[0].key 
                : 'N/A';
            
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                finalImageUrl: p.imageUrl,
                rawUrlComponent: rawKey,
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