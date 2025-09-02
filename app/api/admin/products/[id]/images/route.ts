export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

function uploadsPath(relative = "") {
  const root = path.join(process.cwd(), "public", "uploads", "products");
  return path.join(root, relative);
}
function publicUrl(p: string) {
  return "/uploads/products/" + p.replace(/\\/g, "/");
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const productId = Number(ctx.params.id);
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const alt = (form.get("alt") as string) || null;
    const sortOrder = form.get("sortOrder") ? Number(form.get("sortOrder")) : null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "file_required" }, { status: 400 });
    }

    // Asegurar carpeta
    const dirRel = String(productId);
    const dirAbs = uploadsPath(dirRel);
    await fs.mkdir(dirAbs, { recursive: true });

    const extGuess =
      (file.type && file.type.split("/")[1]) ||
      (file.name && path.extname(file.name).replace(".", "")) ||
      "jpg";
    const fname = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extGuess}`;
    const abs = path.join(dirAbs, fname);

    // Guardar
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(abs, buf);

    const url = publicUrl(path.join(dirRel, fname));
    const created = await prisma.productImage.create({
      data: { productId, url, alt, sortOrder },
    });

    await audit(req, "CREATE", "ProductImage", created.id, { productId, url });

    return NextResponse.json({ ok: true, item: created }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "upload_failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } }) {
  try {
    const productId = Number(ctx.params.id);
    const url = new URL(req.url);
    const imageId = Number(url.searchParams.get("imageId") || "");

    if (!Number.isFinite(imageId)) {
      return NextResponse.json({ ok: false, error: "imageId_required" }, { status: 400 });
    }

    const img = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });
    if (!img) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    // Borrar archivo físico si está dentro de /public/uploads
    if (img.url?.startsWith("/uploads/products/")) {
      const rel = img.url.replace(/^\/uploads\/products\//, "");
      const abs = uploadsPath(rel);
      try {
        await fs.unlink(abs);
      } catch {}
    }

    await prisma.productImage.delete({ where: { id: imageId } });
    await audit(req, "DELETE", "ProductImage", imageId, { productId });

    return NextResponse.json({ ok: true, deleted: true, id: imageId });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "delete_failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
