export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id:true, name:true, slug:true,
      subcats: { orderBy:{ name:"asc" }, select:{ id:true, name:true, slug:true } }
    }
  });
  return NextResponse.json({ ok:true, items });
}