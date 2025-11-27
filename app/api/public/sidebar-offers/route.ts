// app/api/public/sidebar-offers/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take") ?? "5";

  let take = Number(takeParam);
  if (!Number.isFinite(take) || take <= 0) take = 5;
  if (take > 20) take = 20;

  try {
    // Proxy directo al endpoint de ofertas real
    const res = await fetch(`/api/public/offers?take=${take}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "upstream_error" },
        { status: 500 },
      );
    }

    const data = await res.json();
    // data ya es { ok: true, items: [...] } tal como lo usa la página de Ofertas
    return NextResponse.json(data);
  } catch (err) {
    console.error("sidebar-offers proxy error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
