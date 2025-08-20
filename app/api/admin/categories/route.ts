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
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);
  const where = q
    ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] }
    : {};
  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy: { id: "desc" }, take, skip }),
    prisma.category.count({ where }),
  ]);
  return NextResponse.json({ ok: true, items, total });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string | undefined = body?.name;
    let slug: string | undefined = body?.slug;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ ok: false, error: "Nombre requerido" }, { status: 400 });
    }
    slug = slug && typeof slug === "string" && slug.trim() ? slugify(slug) : slugify(name);
    if (!slug) return NextResponse.json({ ok: false, error: "Slug inválido" }, { status: 400 });

    const created = await prisma.category.create({ data: { name: name.trim(), slug } });
    return NextResponse.json({ ok: true, item: created });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}