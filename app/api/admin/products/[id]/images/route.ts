export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { saveProductImage } from "@/lib/storage";
import { extname } from "path";

const OK_TYPES = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/gif","image/avif"]);
const OK_EXTS  = new Set([".jpg",".jpeg",".png",".webp",".gif",".avif"]);

function looksLikeImage(file: File){
  const type = (file as any).type || "";
  const name = (file as any).name || "";
  const okType = OK_TYPES.has(String(type).toLowerCase());
  const okExt  = OK_EXTS.has(extname(String(name)).toLowerCase());
  return okType || okExt;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }){
  const productId = Number(params.id);
  const items = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" }
  });
  return NextResponse.json({ ok:true, items });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }){
  try{
    const productId = Number(params.id);
    const fd = await req.formData();
    const file = fd.get("file");
    const alt = (fd.get("alt")?.toString() || "").slice(0,200);

    if (!(file instanceof File)) {
      return NextResponse.json({ ok:false, error:"file_required" }, { status:400 });
    }
    // tolerante: tipo o extensión
    if (!looksLikeImage(file)) {
      return NextResponse.json({ ok:false, error:"unsupported_type_or_ext" }, { status:415 });
    }
    const size = (file as any).size ?? 0;
    if (size > 6_000_000) {
      return NextResponse.json({ ok:false, error:"too_large", detail:"Máx 6MB" }, { status:413 });
    }

    const { publicUrl } = await saveProductImage(productId, file);
    const max = await prisma.productImage.aggregate({ where:{ productId }, _max:{ sortOrder:true } });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const created = await prisma.productImage.create({
      data: { productId, url: publicUrl, alt: alt || null, sortOrder }
    });

    return NextResponse.json({ ok:true, item: created }, { status:201 });
  }catch(e:any){
    return NextResponse.json({ ok:false, error:"upload_failed", detail: e?.message ?? String(e) }, { status:500 });
  }
}