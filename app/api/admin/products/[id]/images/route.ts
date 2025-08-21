export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: Request, ctx: { params:{ id:string } }){
  const productId = Number(ctx.params.id);
  const items = await prisma.productImage.findMany({
    where:{ productId },
    orderBy:[{ sortOrder:"asc" }, { id:"asc" }]
  });
  return NextResponse.json({ ok:true, items });
}

export async function POST(req: Request, ctx: { params:{ id:string } }){
  const productId = Number(ctx.params.id);
  const { url, alt, sortOrder } = await req.json().catch(()=> ({}));
  if (!url || typeof url !== "string") return NextResponse.json({ ok:false, error:"url required" }, { status:400 });
  const created = await prisma.productImage.create({
    data: { productId, url, alt: alt ?? null, sortOrder: Number(sortOrder ?? 0) }
  });
  return NextResponse.json({ ok:true, item: created });
}

export async function PUT(req: Request, ctx:{ params:{ id:string } }){
  const productId = Number(ctx.params.id);
  const body = await req.json().catch(()=> ({}));
  const imageId = Number(body.id);
  if (!imageId) return NextResponse.json({ ok:false, error:"id required" }, { status:400 });
  const data:any = {};
  if ("url" in body) data.url = body.url;
  if ("alt" in body) data.alt = body.alt ?? null;
  if ("sortOrder" in body) data.sortOrder = Number(body.sortOrder ?? 0);
  const updated = await prisma.productImage.update({
    where:{ id: imageId, AND:{ productId } }, data
  });
  return NextResponse.json({ ok:true, item: updated });
}

export async function DELETE(req: Request, ctx:{ params:{ id:string } }){
  const urlObj = new URL(req.url);
  const productId = Number(ctx.params.id);
  const idParam = urlObj.searchParams.get("id");
  const removeFile = urlObj.searchParams.get("removeFile") === "1";

  let imageId = Number(idParam);
  if (!imageId) {
    // fallback: permitir body JSON
    const body = await req.json().catch(()=> ({}));
    imageId = Number(body?.id);
  }
  if (!imageId) return NextResponse.json({ ok:false, error:"id required" }, { status:400 });

  const row = await prisma.productImage.findUnique({ where:{ id:imageId } });
  if (!row || row.productId !== productId) return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });

  await prisma.productImage.delete({ where:{ id:imageId } });

  if (removeFile && row.url?.startsWith("/uploads/")){
    // Solo borrar si nadie más referencia la misma URL
    const still = await prisma.productImage.count({ where:{ url: row.url } });
    if (still === 0) {
      try {
        const abs = path.join(process.cwd(), "public", row.url.replace(/^\/+/,""));
        // Seguridad: dentro de /public
        const pubRoot = path.join(process.cwd(), "public");
        const real = path.resolve(abs);
        if (real.startsWith(pubRoot)) await fs.unlink(real);
      } catch {}
    }
  }

  return NextResponse.json({ ok:true, id: imageId, deleted:true, removedFile: removeFile || false });
}