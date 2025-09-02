export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { slugify } from "@/lib/slug";
import { audit } from "@/lib/audit";

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.coerce.number().optional().nullable(),
  sku: z.string().max(120).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
  categoryId: z.coerce.number().optional().nullable(),
  subcategoryId: z.coerce.number().optional().nullable(),
});

// GET /api/admin/products
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = Math.min(60, Math.max(1, parseInt(url.searchParams.get("perPage") || "12", 10)));

  const status = url.searchParams.get("status") || "";
  const categoryId = parseInt(url.searchParams.get("categoryId") || "", 10);
  const subcategoryId = parseInt(url.searchParams.get("subcategoryId") || "", 10);
  const minPrice = parseFloat(url.searchParams.get("minPrice") || "");
  const maxPrice = parseFloat(url.searchParams.get("maxPrice") || "");

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { description: { contains: q } },
      { sku: { contains: q } },
    ];
  }
  if (status === "ACTIVE" || status === "INACTIVE" || status === "DRAFT") where.status = status;
  if (Number.isFinite(categoryId)) where.categoryId = categoryId;
  if (Number.isFinite(subcategoryId)) where.subcategoryId = subcategoryId;
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    where.price = {};
    if (Number.isFinite(minPrice)) where.price.gte = minPrice;
    if (Number.isFinite(maxPrice)) where.price.lte = maxPrice;
  }

  const skip = (page - 1) * perPage;
  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { id: "desc" },
      include: {
        category: true,
        subcategory: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, page, perPage, total, items });
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "validation_failed", detail: parsed.error.format() },
        { status: 400 }
      );
    }
    const b = parsed.data;
    const newSlug = b.slug?.trim() || slugify(b.name);
    const created = await prisma.product.create({
      data: {
        name: b.name,
        slug: newSlug,
        description: b.description ?? null,
        price: b.price ?? null,
        sku: (b.sku || "") || null,
        status: b.status || "ACTIVE",
        categoryId: b.categoryId ?? null,
        subcategoryId: b.subcategoryId ?? null,
      },
    });
    await audit(req, "CREATE", "Product", created.id, { name: b.name, slug: newSlug });
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "unique_constraint", field: "slug" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "create_failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
