// lib/catalog-helpers.ts

import { Prisma } from "@prisma/client/edge";

// El tipo de dato que devuelve Prisma al usar select/include
type ProductWithRelations = Prisma.ProductGetPayload<{
    select: {
        id: true;
        name: true;
        slug: true;
        price: true;
        status: true;
        images: {
            select: { key: true };
        };
        variants: {
            select: { price: true, priceOriginal: true, active: true };
        };
    };
}>;

// El tipo final que le enviaremos al frontend (solo los campos necesarios)
export type LandingProduct = {
    id: number;
    name: string;
    slug: string;
    priceFinal: number | null; // El precio más bajo / de oferta resuelto
    imageUrl: string | null; // La URL de imagen final resuelta
    status: string | null;
};


// 🖼️ Lógica de Fallback de Imágenes (lo que faltaba)
// Esta función intenta obtener la clave de la imagen de la DB, 
// y si falla, crea una clave genérica basada en el ID del producto
export function resolveCoverKey(product: ProductWithRelations): string | null {
    const dbKey = product.images[0]?.key;

    // 1. Si la DB tiene una clave, la usamos.
    if (dbKey) {
        return dbKey;
    }
    
    // 2. Si no hay clave en DB, asumimos el formato genérico de R2 (fallback)
    // El formato es: products/[id]/[id].jpg o products/[id]/cover.jpg
    // Puedes ajustar el nombre de la imagen que usas como fallback.
    return `products/${product.id}/${product.id}.jpg`;
}


// 💲 Lógica de Resolución de Precios (Simplificada)
// En un entorno real, aquí iría la llamada a 'computePricesBatch'
export function resolveFinalPrice(product: ProductWithRelations): number | null {
    // 1. Recoger todos los precios de variantes activas
    const activePrices = product.variants
        .filter(v => v.active && v.price !== null)
        .map(v => v.price!);

    // 2. Si hay precios de variantes, encontrar el mínimo.
    if (activePrices.length > 0) {
        return Math.min(...activePrices);
    }

    // 3. De lo contrario, usar el precio base del producto
    return product.price ?? null;
}


// 🧩 Función de Mapeo Principal para el Landing
export function mapToLandingProduct(
    product: ProductWithRelations, 
    r2BaseUrl: string
): LandingProduct {
    
    const rawKey = resolveCoverKey(product);
    const priceFinal = resolveFinalPrice(product);

    let imageUrl: string | null = null;
    if (rawKey && r2BaseUrl) {
        // Construcción de la URL (la misma lógica que ya teníamos)
        imageUrl = `${r2BaseUrl.replace(/\/+$/, "")}/${rawKey.replace(
            /^\/|\/+$/,
            ""
        )}`;
    }

    return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        status: product.status,
        priceFinal, // Usamos el precio resuelto
        imageUrl,   // Usamos la URL resuelta (con fallback)
    };
}