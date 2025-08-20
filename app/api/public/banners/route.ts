export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.banner.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id:true, title:true, imageUrl:true, link:true }
  });
  return NextResponse.json({ ok:true, items });
}