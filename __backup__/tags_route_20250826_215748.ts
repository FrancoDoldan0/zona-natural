export const runtime = "nodejs";
import { NextRequest } from "next/server";
import { json } from "@/lib/json";
import prisma from "@/lib/prisma";

function parseBool(v?: string | null){
  if(!v) return false;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const onlyActive = parseBool(url.searchParams.get("onlyActive"));

  if (!onlyActive) {
    // Modo compatible: cuenta todos los vínculos (sin filtrar por estado del producto)
    const rows = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { productTags: true } } },
    });
    const items = rows.map(t => ({
      id: t.id,
      name: t.name,
      productCount: t._count.productTags,
    }));
    return json({ ok: true, items });
  }

  // Modo nuevo: contar SOLO productos activos (Product.status = 'ACTIVE')
  const grouped = await prisma.productTag.groupBy({
    by: ["tagId"],
    _count: { tagId: true },
    where: { product: { status: "ACTIVE" } }, // usa relación ProductTag.product
  });

  const tagIds = grouped.map(g => g.tagId);
  if (tagIds.length === 0) return json({ ok: true, items: [] });

  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    orderBy: { name: "asc" },
  });

  const countMap = new Map(grouped.map(g => [g.tagId, g._count.tagId]));
  const items = tags.map(t => ({
    id: t.id,
    name: t.name,
    productCount: countMap.get(t.id) ?? 0,
  }));

  return json({ ok: true, items });
}