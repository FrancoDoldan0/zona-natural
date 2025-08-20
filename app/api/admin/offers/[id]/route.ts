export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  discountType: z.enum(["PERCENT","AMOUNT"]).optional(),
  discountVal: z.coerce.number().nonnegative().optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  productId: z.coerce.number().int().positive().nullable().optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  tagId: z.coerce.number().int().positive().nullable().optional(),
});

export async function GET(_req: Request, ctx: { params:{ id:string } }) {
  const id = Number(ctx.params.id);
  const item = await prisma.offer.findUnique({
    where: { id },
    include: { product:true, category:true, tag:true }
  });
  if (!item) return NextResponse.json({ ok:false, error:"No encontrada" }, { status:404 });
  return NextResponse.json({ ok:true, item });
}

export async function PUT(req: Request, ctx: { params:{ id:string } }) {
  const id = Number(ctx.params.id);
  const raw = await req.json().catch(()=> ({}));
  const data = bodySchema.parse(raw);

  const links = [data.productId, data.categoryId, data.tagId].filter(v=>v);
  if (links.length > 1) {
    return NextResponse.json({ ok:false, error: "Elija solo un destino (producto o categoría o tag)." }, { status: 400 });
  }

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      ...("title" in data ? { title: data.title! } : {}),
      ...("description" in data ? { description: data.description ?? null } : {}),
      ...("discountType" in data ? { discountType: data.discountType! } : {}),
      ...("discountVal" in data ? { discountVal: data.discountVal! } : {}),
      ...("startAt" in data ? { startAt: data.startAt ? new Date(data.startAt) : null } : {}),
      ...("endAt" in data ? { endAt: data.endAt ? new Date(data.endAt) : null } : {}),
      ...("productId" in data ? { productId: data.productId ?? null } : {}),
      ...("categoryId" in data ? { categoryId: data.categoryId ?? null } : {}),
      ...("tagId" in data ? { tagId: data.tagId ?? null } : {}),
    }
  });
  return NextResponse.json({ ok:true, item: updated });
}

export async function DELETE(_req: Request, ctx: { params:{ id:string } }) {
  const id = Number(ctx.params.id);
  await prisma.offer.delete({ where: { id } });
  return NextResponse.json({ ok:true, id, deleted:true });
}