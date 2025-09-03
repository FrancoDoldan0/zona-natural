cat > app/api/admin/products/[id]/images/reorder/route.ts <<'TS'
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  // Acepta números o strings numéricos
  desiredIds: z.array(z.union([z.number().int(), z.string().regex(/^\d+$/)])).min(1)
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // params.id -> number (porque productImage.productId es Int)
    const productId = Number(params.id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
    }

    // validar body y normalizar desiredIds a number[]
    const json = await req.json();
    const parsed = BodySchema.parse(json);
    const desiredIds: number[] = parsed.desiredIds.map(v => typeof v === "string" ? Number(v) : v);

    // Traer ids existentes del producto
    const existing = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: "asc" }, // si tu campo es sortOrder, cambia aquí y abajo
      select: { id: true },
    });

    const existingIds = new Set(existing.map(e => e.id));
    const missing = desiredIds.filter(id => !existingIds.has(id));
    if (missing.length) {
      return NextResponse.json({ ok: false, error: `IDs no pertenecen al producto: ${missing.join(", ")}` }, { status: 400 });
    }

    // final: primero los solicitados (en su orden), luego el resto
    const remainder = existing.map(e => e.id).filter(id => !desiredIds.includes(id));
    const finalOrder = [...desiredIds, ...remainder];

    await prisma.$transaction(
      finalOrder.map((id, idx) =>
        prisma.productImage.update({
          where: { id },
          data: { order: idx }, // si usas sortOrder, cambia a { sortOrder: idx }
        })
      )
    );

    return NextResponse.json({ ok: true, order: finalOrder });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
TS
