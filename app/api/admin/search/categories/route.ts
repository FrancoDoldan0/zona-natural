export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() || "";
  const items = await prisma.category.findMany({
    where: q ? { OR:[
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } }
    ] } : undefined,
    select: { id:true, name:true, slug:true },
    orderBy: { name: "asc" },
    take: 50
  });
  return NextResponse.json({ ok:true, items });
}