// app/api/public/sidebar-offers/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

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

  try {
    const res = await fetch(upstream.toString(), {
      // No cacheamos para que siempre muestre lo actual
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("sidebar-offers upstream error", res.status);
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 500 },
      );
    }

    const data = await res.json();

    // data ya viene en el mismo formato que usa la página de Ofertas:
    // { ok: true, items: [...] }
    return NextResponse.json(data);
  } catch (err) {
    console.error("sidebar-offers internal error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
