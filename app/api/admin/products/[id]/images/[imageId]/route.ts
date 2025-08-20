export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  alt: z.string().optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
});

export async function PUT(req: Request, ctx: { params: { id: string; imageId: string } }) {
  const productId = Number(ctx.params.id);
  const imageId = Number(ctx.params.imageId);
  const data = updateSchema.parse(await req.json().catch(() => ({})));

  // Verifica pertenencia
  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img || img.productId !== productId) {
    return NextResponse.json({ ok:false, error:"No encontrado" }, { status:404 });
  }

  const updated = await prisma.productImage.update({
    where: { id: imageId },
    data: {
      ...("alt" in data ? { alt: data.alt ?? null } : {}),
      ...("order" in data ? { sortOrder: data.order! } : {}),
    },
  });
  return NextResponse.json({ ok:true, item: updated });
}

export async function DELETE(_req: Request, ctx: { params: { id: string; imageId: string } }) {
  const productId = Number(ctx.params.id);
  const imageId = Number(ctx.params.imageId);

  const img = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!img || img.productId !== productId) {
    return NextResponse.json({ ok:false, error:"No encontrado" }, { status:404 });
  }
  await prisma.productImage.delete({ where: { id: imageId } });
  return NextResponse.json({ ok:true, id: imageId, deleted: true });
}