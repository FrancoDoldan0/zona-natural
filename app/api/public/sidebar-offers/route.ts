// app/api/public/sidebar-offers/route.ts
export const runtime = "edge";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");

  let take = Number(takeParam ?? "5");
  if (!Number.isFinite(take) || take <= 0) take = 5;
  if (take > 20) take = 20;

  try {
    const products = await db.product.findMany({
      where: {
        status: "ACTIVE",
        price: { not: null },
        priceOriginal: { not: null },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        price: true,
        priceOriginal: true,
      },
      orderBy: {
        id: "desc",
      },
      take,
    });

    // Nos quedamos solo con los que realmente tienen descuento
    const items = products.filter(
      (p) =>
        typeof p.price === "number" &&
        typeof p.priceOriginal === "number" &&
        p.priceOriginal > p.price
    );

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("sidebar offers error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 }
    );
  }
}
