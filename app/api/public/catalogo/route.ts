export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toInt(v: string | null, def: number) {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : def;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || undefined;
  const subcategory = searchParams.get("subcategory") || undefined;

  const page = toInt(searchParams.get("page"), 1);
  const perPage = toInt(searchParams.get("perPage"), 12);
  const order = searchParams.get("order") || "newest"; // newest | price_asc | price_desc

  const where: any = { status: "ACTIVE" };

  if (q) {
    // En SQLite no hay `mode: "insensitive"`, usamos contains simple
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
    ];
  }
  if (category) where.category = { slug: category };
  if (subcategory) where.subcategory = { slug: subcategory };

  const orderBy =
    order === "price_asc" ? { price: "asc" } :
    order === "price_desc" ? { price: "desc" } :
    { createdAt: "desc" };

  const skip = (page - 1) * perPage;

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: perPage,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        sku: true,
        status: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    meta: { page, perPage, total, pages: Math.ceil(total / perPage) },
    items,
  });
}