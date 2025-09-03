export const runtime = "nodejs";

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const BodySchema = z.object({
  // Acepta números o strings numéricos
  desiredIds: z.array(z.union([z.number().int(), z.string().regex(/^\d+$/)])).min(1),
});
type Body = z.infer<typeof BodySchema>;

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    // params.id -> number (productImage.productId es Int en Prisma)
    const productId = Number(params.id);
    if (!Number.isFinite(productId)) {
      return NextResponse.json({ ok: false, error: "Invalid product id" }, { status: 400 });
    }

    // validar body y normalizar desiredIds a number[]
    const body: Body = BodySchema.parse(await req.json());
    const desiredIds: number[] = body.desiredIds.map(v => (typeof v === "string" ? Number(v) : v));

    // Traer ids existentes del producto
    const existing = await prisma.productImage.findMany({
      where: { productId },
      orderBy: { order: "asc" }, // Si tu campo se llama sortOrder, cambia aquí y abajo.
      select: { id: true },
    });

    const existingIds = new Set(existing.map(e => e.id));
    const missing = desiredIds.filter(id => !existingIds.has(id));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `IDs no pertenecen al producto: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // final: primero los solicitados (en su orden), luego el resto
    const remainder = existing.map(e => e.id).filter(id => !desiredIds.includes(id));
    const finalOrder = [...desiredIds, ...remainder];

    await prisma.$transaction(
      finalOrder.map((id, idx) =>
        prisma.productImage.update({
          where: { id },
          data: { order: idx }, // Si usas sortOrder, cambiar a { sortOrder: idx }
        })
      )
    );

    return NextResponse.json({ ok: true, order: finalOrder });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unexpected error" }, { status: 500 });
  }
}
