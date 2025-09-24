// app/api/admin/uploads/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { r2Put, r2Delete, publicR2Url } from '@/lib/storage';
import { createPrisma } from '@/lib/prisma-edge';

const prisma = createPrisma();
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function parseBool(v: unknown) {
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export async function POST(req: Request) {
  const ip = req.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  if (!rateLimit(req, ['upload', ip], { max: 8, windowMs: 60_000 }).ok) {
    return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
  }

  try {
    const form = await req.formData();

    const file = form.get('file');
    const productIdRaw = form.get('productId');
    const altRaw = form.get('alt');
    const forceCoverRaw = form.get('isCover');

    // Validaciones básicas
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'file is required (multipart/form-data)' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const productId = Number(productIdRaw);
    if (!Number.isFinite(productId) || productId <= 0) {
      return NextResponse.json(
        { error: 'productId must be a positive integer' },
        { status: 400 },
      );
    }

    const alt =
      typeof altRaw === 'string'
        ? altRaw.trim().slice(0, 280) || null
        : null;
    const forceCover = parseBool(forceCoverRaw);

    // Generar key en R2
    const name = (file as any).name || 'upload.bin';
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'bin';
    const key = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    // Subir a R2
    const contentType = (file as any).type || 'application/octet-stream';
    const publicUrl = await r2Put(key, file.stream(), contentType);

    // Calcular orden e isCover
    const existing = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
      _count: true,
    });

    const isFirst = (existing?._count ?? 0) === 0;
    const sortOrder = (existing?._max?.sortOrder ?? -1) + 1;
    const isCover = isFirst || forceCover;

    // Crear registro en DB
    const created = await prisma.productImage.create({
      data: {
        productId,
        key,
        alt,
        isCover,
        sortOrder,
        size: Number(file.size) || null,
        // podrías setear width/height si más adelante lees metadata
      },
      select: {
        id: true,
        productId: true,
        key: true,
        alt: true,
        isCover: true,
        sortOrder: true,
        size: true,
      },
    });

    // Si marcamos portada y no es la primera, desmarcamos el resto
    if (isCover && !isFirst) {
      await prisma.productImage.updateMany({
        where: { productId, id: { not: created.id }, isCover: true },
        data: { isCover: false },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        image: {
          ...created,
          url: publicR2Url(created.key),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err: any) {
    // Si ya subimos a R2 y pudimos inferir la key, intentamos limpiar
    try {
      const maybeKey = (err?.cause?.key as string) || undefined;
      if (maybeKey) await r2Delete(maybeKey);
    } catch {
      // noop
    }

    // Respuesta de error segura
    return NextResponse.json(
      { ok: false, error: 'upload_failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
