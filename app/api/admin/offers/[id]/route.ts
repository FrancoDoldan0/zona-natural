export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  discountType: z.enum(["PERCENT","AMOUNT"]).optional(),
  discountVal: z.coerce.number().positive().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  productId: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional().nullable(),
  tagId: z.coerce.number().int().positive().optional().nullable(),
});

function parseDates(v: any) {
  const out:any = {};
  if ("startAt" in v) {
    if (v.startAt==null) out.startAt = null;
    else {
      const d = new Date(v.startAt);
      if (isNaN(+d)) throw new Error("startAt inválido"); out.startAt = d;
    }
  }
  if ("endAt" in v) {
    if (v.endAt==null) out.endAt = null;
    else {
      const d = new Date(v.endAt);
      if (isNaN(+d)) throw new Error("endAt inválido"); out.endAt = d;
    }
  }
  if (out.startAt && out.endAt && out.endAt < out.startAt) throw new Error("endAt < startAt");
  return out;
}

function checkTargets(v: any) {
  const keys = ["productId","categoryId","tagId"].filter(k => k in v);
  if (!keys.length) return;
  const tgt = [v.productId ?? null, v.categoryId ?? null, v.tagId ?? null].filter(x => x!=null);
  if (tgt.length > 1) throw new Error("Solo se permite un destino (producto O categoría O tag)");
}

export async function GET(_req: Request, ctx:{ params:{ id:string } }) {
  const id = Number(ctx.params.id);
  const item = await prisma.offer.findUnique({
    where: { id },
    include: {
      product: { select: { id:true, name:true, slug:true } },
      category:{ select: { id:true, name:true, slug:true } },
      tag:     { select: { id:true, name:true } },
    }
  });
  if (!item) return NextResponse.json({ ok:false, error:"Not found" }, { status:404 });
  return NextResponse.json({ ok:true, item });
}

export async function PUT(req: Request, ctx:{ params:{ id:string } }) {
  try {
    const id = Number(ctx.params.id);
    const body = patchSchema.parse(await req.json().catch(()=> ({})));
    checkTargets(body);
    if (body.discountType === "PERCENT" && body.discountVal!=null && (body.discountVal <= 0 || body.discountVal > 100)) {
      return NextResponse.json({ ok:false, error:"PERCENT debe estar entre 0 y 100" }, { status:400 });
    }
    const datePatch = parseDates(body);
    const data:any = { ...body, ...datePatch };

    const updated = await prisma.offer.update({
      where: { id },
      data,
      include: {
        product: { select:{ id:true, name:true, slug:true } },
        category:{ select:{ id:true, name:true, slug:true } },
        tag:     { select:{ id:true, name:true } },
      }
    });
    return NextResponse.json({ ok:true, item: updated });
  } catch (e:any) {
    const msg = e?.issues ? "Datos inválidos" : (e?.message || "Error");
    return NextResponse.json({ ok:false, error: msg, issues: e?.issues }, { status:400 });
  }
}

export async function DELETE(_req: Request, ctx:{ params:{ id:string } }) {
  const id = Number(ctx.params.id);
  await prisma.offer.delete({ where: { id } });
  return NextResponse.json({ ok:true, id, deleted:true });
}