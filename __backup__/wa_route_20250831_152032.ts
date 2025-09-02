export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildWaLink } from "@/lib/wa";
import { siteUrl } from "@/lib/site";

function safeInt(v?: string | null) {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const id   = safeInt(url.searchParams.get("id"));
  const slug = (url.searchParams.get("slug") || "").trim();
  const qty  = safeInt(url.searchParams.get("qty")) ?? 1;
  const ref  = (url.searchParams.get("ref") || "").slice(0, 64);
  const dry  = (url.searchParams.get("dry") || "") === "1";

  let product: { id:number; name:string; slug:string } | null = null;
  if (id) {
    product = await prisma.product.findFirst({ where: { id, status: "ACTIVE" }, select: { id:true, name:true, slug:true }});
  } else if (slug) {
    product = await prisma.product.findFirst({ where: { slug, status: "ACTIVE" }, select: { id:true, name:true, slug:true }});
  }

  const lines: string[] = [];
  if (product) {
    lines.push(`Hola! Quiero pedir: ${product.name}`);
    if (qty) lines.push(`Cantidad: ${qty}`);
    lines.push(`Link: ${siteUrl}/producto/${product.slug}`);
  } else {
    lines.push("Hola! Quiero hacer una consulta/pedido.");
  }
  if (ref) lines.push(`Ref: ${ref}`);

  const waUrl = buildWaLink({ text: lines.join("\n") });

  try {
    await prisma.auditLog.create({
      data: {
        action: "WA_CLICK",
        entity: product ? "Product" : "Generic",
        entityId: product ? String(product.id) : undefined,
        details: JSON.stringify({ slug: product?.slug, qty, ref, waUrl }),
      },
    });
  } catch {}

  if (dry) {
    return new NextResponse(JSON.stringify({ ok: true, url: waUrl }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  return NextResponse.redirect(waUrl, { headers: { "cache-control": "no-store" } });
}