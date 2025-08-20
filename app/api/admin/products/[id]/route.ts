export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  const body = await req.json().catch(()=> ({}));
  const data:any = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body?.slug === "string" && body.slug.trim()) data.slug = slugify(body.slug);
  if ("description" in body) data.description = typeof body.description === "string" ? body.description : null;
  if ("price" in body) data.price = (body.price != null && !Number.isNaN(Number(body.price))) ? Number(body.price) : null;
  if ("sku" in body) data.sku = typeof body.sku === "string" ? body.sku : null;
  if ("status" in body && typeof body.status === "string") data.status = body.status;
  if ("categoryId" in body) data.categoryId = (body.categoryId != null && Number.isInteger(Number(body.categoryId))) ? Number(body.categoryId) : null;
  if ("subcategoryId" in body) data.subcategoryId = (body.subcategoryId != null && Number.isInteger(Number(body.subcategoryId))) ? Number(body.subcategoryId) : null;

  const item = await prisma.product.update({ where: { id }, data });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });

  try {
    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: id } }),
      prisma.productTag.deleteMany({ where: { productId: id } }),
      prisma.offer.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true, deleted: true });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo borrar" }, { status: 409 });
  }
}