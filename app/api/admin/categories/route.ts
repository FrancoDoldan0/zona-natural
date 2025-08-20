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
  const take = Math.min(parseInt(url.searchParams.get("take") || "50", 10), 200);
  const skip = parseInt(url.searchParams.get("skip") || "0", 10);

  const where: any = q ? {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ]
  } : {};

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
    if (!name || !name.trim()) return NextResponse.json({ ok: false, error: "Nombre requerido" }, { status: 400 });
    const slug: string = body?.slug?.trim() ? slugify(body.slug) : slugify(name);

    const item = await prisma.category.create({ data: { name: name.trim(), slug } });
    return NextResponse.json({ ok: true, item });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}