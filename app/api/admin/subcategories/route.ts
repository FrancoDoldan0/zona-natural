export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const categoryIdParam = url.searchParams.get("categoryId");
  const take = Math.min(parseInt(url.searchParams.get("take") || "100", 10), 300);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);

  const where:any = {};
  if (q) where.OR = [
    { name: { contains: q, mode: "insensitive" } },
    { slug: { contains: q, mode: "insensitive" } },
  ];
  if (categoryIdParam) {
    const cid = Number(categoryIdParam);
    if (Number.isInteger(cid)) where.categoryId = cid;
  }

  const [items, total] = await Promise.all([
    prisma.subcategory.findMany({ where, orderBy: { id: "desc" }, take, skip }),
    prisma.subcategory.count({ where }),
  ]);
  return NextResponse.json({ ok: true, items, total });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string | undefined = body?.name;
    const categoryId = Number(body?.categoryId);
    if (!name || !name.trim()) return NextResponse.json({ ok: false, error: "Nombre requerido" }, { status: 400 });
    if (!Number.isInteger(categoryId)) return NextResponse.json({ ok: false, error: "categoryId requerido" }, { status: 400 });

    const slug: string = body?.slug?.trim() ? slugify(body.slug) : slugify(name);
    const item = await prisma.subcategory.create({
      data: { name: name.trim(), slug, categoryId }
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}