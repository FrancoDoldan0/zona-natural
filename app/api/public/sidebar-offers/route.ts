// app/api/public/sidebar-offers/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

/**
 * Endpoint público para las ofertas del sidebar.
 * Ahora actúa como un proxy muy fino hacia /api/public/offers,
 * que ya unifica:
 *  - Ofertas de la tabla Offer
 *  - Productos con priceOriginal / priceFinal
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Por si algún día le pasamos ?take=8, lo respetamos, sino usamos 5
  const takeParam = url.searchParams.get("take") ?? "5";
  let take = Number.parseInt(takeParam, 10);
  if (!Number.isFinite(take) || take <= 0) take = 5;
  if (take > 20) take = 20;

  // Construimos la URL del endpoint REAL de ofertas (el que ya funciona)
  const upstream = new URL("/api/public/offers", url);
  upstream.searchParams.set("take", String(take));
  upstream.searchParams.set("source", "sidebar");

  try {
    const res = await fetch(upstream.toString(), {
      // No cacheamos para que siempre muestre lo actual
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("sidebar-offers upstream error", res.status);
      return NextResponse.json(
        { ok: false, error: "upstream_error", items: [] },
        { status: 500 },
      );
    }

    // Lo tipamos explícitamente como any para que TS no se queje
    const data: any = await res.json();

    // data ya viene en el mismo formato que usa la página de Ofertas:
    // { ok: true, items: [...] } — lo devolvemos tal cual
    return NextResponse.json(data);
  } catch (err) {
    console.error("sidebar-offers internal error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error", items: [] },
      { status: 500 },
    );
  }
}
