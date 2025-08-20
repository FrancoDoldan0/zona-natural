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

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  const item = await prisma.subcategory.findUnique({ where: { id }, include: { category: true } });
  if (!item) return NextResponse.json({ ok: false, error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  try {
    const body = await req.json();
    const data: any = {};
    if (typeof body?.name === "string") data.name = body.name.trim();
    if (typeof body?.slug === "string") data.slug = slugify(body.slug);
    if (Number.isInteger(body?.categoryId)) data.categoryId = Number(body.categoryId);
    if (!Object.keys(data).length) {
      return NextResponse.json({ ok: false, error: "Nada para actualizar" }, { status: 400 });
    }
    const updated = await prisma.subcategory.update({ where: { id }, data });
    return NextResponse.json({ ok: true, item: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: { params: { id: string } }) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
  try {
    await prisma.subcategory.delete({ where: { id } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch {
    // Puede fallar si hay productos asociados
    return NextResponse.json({ ok: false, error: "No se pudo borrar ( FK / no existe )" }, { status: 409 });
  }
}