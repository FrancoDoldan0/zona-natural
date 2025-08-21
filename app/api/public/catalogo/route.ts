export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toNum(v: string|null, d=1){ const n = Number(v); return Number.isFinite(n) && n>0 ? n : d; }

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = url.searchParams.get("category");
  const subcategory = url.searchParams.get("subcategory");
  const page = toNum(url.searchParams.get("page"), 1);
  const perPage = Math.min(toNum(url.searchParams.get("perPage"), 12), 60);
  const order = (url.searchParams.get("order") ?? "newest");

  const where:any = { status: "ACTIVE" };
  if (q) where.OR = [
    { name: { contains: q } },
    { slug: { contains: q } },
    { description: { contains: q } },
  ];
  if (category) where.category = { slug: category };
  if (subcategory) where.subcategory = { slug: subcategory };

  const orderBy = order === "price_asc" ? { price: "asc" } :
                  order === "price_desc" ? { price: "desc" } :
                  { updatedAt: "desc" };

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where, orderBy, skip: (page-1)*perPage, take: perPage,
      select: {
        id:true, name:true, slug:true, price:true, sku:true, description:true,
        category: { select: { name:true, slug:true } },
        images: { select: { url:true }, orderBy:[{sortOrder:"asc"},{id:"asc"}], take:1 }
      }
    })
  ]);

  const mapped = items.map(p => ({
    id: p.id, name: p.name, slug: p.slug, price: p.price, sku: p.sku,
    description: p.description,
    category: p.category,
    coverUrl: p.images[0]?.url ?? null
  }));

  return NextResponse.json({ ok:true, total, page, perPage, items: mapped });
}