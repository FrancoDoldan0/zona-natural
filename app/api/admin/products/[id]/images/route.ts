export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  url: z.string().min(1),
  alt: z.string().optional().nullable(),
  order: z.coerce.number().int().min(0).optional(),
});

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  const productId = Number(ctx.params.id);
  const items = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const productId = Number(ctx.params.id);
  try {
    const body = createSchema.parse(await req.json());
    const item = await prisma.productImage.create({
      data: {
        productId,
        url: body.url,
        alt: body.alt ?? null,
        sortOrder: body.order ?? 0,
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    if (e?.issues) return NextResponse.json({ ok:false, error:"Datos inválidos", issues:e.issues }, { status:400 });
    return NextResponse.json({ ok:false, error:"Error" }, { status:500 });
  }
}