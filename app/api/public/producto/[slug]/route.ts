export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: { params:{ slug:string } }) {
  const slug = ctx.params.slug;
  const item = await prisma.product.findUnique({
    where: { slug },
    include: {
      category:    { select:{ id:true, name:true, slug:true } },
      subcategory: { select:{ id:true, name:true, slug:true } },
      images:      { select:{ id:true, url:true, alt:true, sortOrder:true }, orderBy:[{ sortOrder:"asc" },{ id:"asc" }] }
    }
  });
  if (!item) return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
  return NextResponse.json({ ok:true, item });
}