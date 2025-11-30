// app/api/public/sidebar-offers/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // ?take=6 (por defecto 5, máximo 24)
  const takeParam = url.searchParams.get("take") ?? "5";
  let take = Number.parseInt(takeParam, 10);
  if (!Number.isFinite(take) || take <= 0) take = 5;
  if (take > 24) take = 24;

  try {
    const upstream = new URL("/api/public/catalogo", url);
    upstream.searchParams.set("status", "all");
    upstream.searchParams.set("onSale", "1");
    upstream.searchParams.set("perPage", String(take * 4));
    upstream.searchParams.set("sort", "-id");

    const res = await fetch(upstream.toString(), {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(
        "[sidebar-offers] upstream error",
        res.status,
      );
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const itemsRaw: any[] =
      (data?.items as any[]) ??
      (data?.data as any[]) ??
      (Array.isArray(data) ? (data as any[]) : []);

    if (!Array.isArray(itemsRaw) || !itemsRaw.length) {
      return NextResponse.json({ ok: true, items: [] });
    }

    // Nos quedamos sólo con los que realmente tienen descuento
    const withDiscount = itemsRaw.filter((p) => {
      if (typeof p.hasDiscount === "boolean")
        return p.hasDiscount;
      const orig =
        typeof p.priceOriginal === "number"
          ? p.priceOriginal
          : null;
      const fin =
        typeof p.priceFinal === "number"
          ? p.priceFinal
          : null;
      return orig != null && fin != null && fin < orig;
    });

    // Ordenar por porcentaje de descuento (si lo tenemos)
    withDiscount.sort((a, b) => {
      const da =
        typeof a.discountPercent === "number"
          ? a.discountPercent
          : 0;
      const db =
        typeof b.discountPercent === "number"
          ? b.discountPercent
          : 0;
      return db - da;
    });

    return NextResponse.json({
      ok: true,
      items: withDiscount.slice(0, take),
    });
  } catch (err) {
    console.error("[sidebar-offers] internal error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
