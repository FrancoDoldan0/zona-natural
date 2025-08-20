export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENT","AMOUNT"]),
  discountVal: z.coerce.number().nonnegative(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  productId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  tagId: z.coerce.number().int().positive().optional().nullable(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const take = Number(searchParams.get("take") ?? 100);
  const where: any = {};
  if (q) where.OR = [
    { title:   { contains: q, mode: "insensitive" } },
    { description: { contains: q, mode: "insensitive" } },
  ];

  const items = await prisma.offer.findMany({
    where,
    take,
    orderBy: { createdAt: "desc" },
    include: { product: { select: { id:true,name:true } },
               category:{ select: { id:true,name:true } },
               tag:{ select:{ id:true,name:true } } }
  });
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const data = bodySchema.parse(raw);

    // validar vínculo único
    const links = [data.productId, data.categoryId, data.tagId].filter(v=>!!v);
    if (links.length > 1) {
      return NextResponse.json({ ok:false, error: "Elija solo un destino (producto o categoría o tag)." }, { status: 400 });
    }

    const created = await prisma.offer.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        discountType: data.discountType,
        discountVal: data.discountVal,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt:   data.endAt   ? new Date(data.endAt)   : null,
        productId: data.productId ?? null,
        categoryId: data.categoryId ?? null,
        tagId: data.tagId ?? null,
      }
    });

    return NextResponse.json({ ok: true, item: created });
  } catch (e:any) {
    if (e?.issues) return NextResponse.json({ ok:false, error:"Datos inválidos", issues:e.issues }, { status:400 });
    return NextResponse.json({ ok:false, error:"Error" }, { status:500 });
  }
}