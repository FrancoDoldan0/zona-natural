// app/api/admin/uploads/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { r2Put, r2Delete, publicR2Url } from '@/lib/storage';
import { createPrisma } from '@/lib/prisma-edge';

const prisma = createPrisma();
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function parseBool(v: unknown, def = false) {
  if (typeof v !== 'string') return def;
  const s = v.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off'].includes(s)) return false;
  return def;
}

function strOrNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function intOrNull(v: FormDataEntryValue | null) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function POST(req: Request) {
  const ip = req.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  if (!rateLimit(req, ['upload', ip], { max: 8, windowMs: 60_000 }).ok) {
    return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
  }

  let uploadedKey: string | null = null;

  try {
    const form = await req.formData();

    // 'product' (default) | 'banner'
    const kind = (strOrNull(form.get('kind')) || 'product').toLowerCase();

    // Archivo
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'file is required (multipart/form-data)' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const originalName = (file as any).name || 'upload.bin';
    const ext = originalName.includes('.')
      ? originalName.split('.').pop()!.toLowerCase()
      : 'bin';
    const contentType = (file as any).type || 'application/octet-stream';

    // Generar key en R2
    let key: string;
    if (kind === 'banner') {
      key = `banners/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    } else {
      // product image requiere productId
      const productId = intOrNull(form.get('productId'));
      if (!productId || productId <= 0) {
        return NextResponse.json(
          { error: 'productId must be a positive integer' },
          { status: 400 },
        );
      }
      key = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    }

    // Subir a R2 (stream WHATWG; válido en Edge)
    await r2Put(key, file.stream(), contentType);
    uploadedKey = key;

    if (kind === 'banner') {
      // Campos opcionales para Banner
      const title = strOrNull(form.get('title')) || originalName;
      const linkUrl = strOrNull(form.get('linkUrl')) || strOrNull(form.get('link')) || null;
      const placement =
        (strOrNull(form.get('placement')) as
          | 'HOME'
          | 'PRODUCTS'
          | 'CATEGORY'
          | 'CHECKOUT'
          | null) || 'HOME';
      const isActive = parseBool(form.get('isActive') ?? form.get('active'), true);
      const categoryId =
        placement === 'CATEGORY' ? intOrNull(form.get('categoryId')) : null;
      const startAtStr = strOrNull(form.get('startAt'));
      const endAtStr = strOrNull(form.get('endAt'));
      const startAt = startAtStr ? new Date(startAtStr) : null;
      const endAt = endAtStr ? new Date(endAtStr) : null;

      // sortOrder siguiente (global). Si querés por placement, agregá where:{placement}
      const max = await prisma.banner.aggregate({ _max: { sortOrder: true } });
      const sortOrder = (max._max.sortOrder ?? 0) + 1;

      const created = await prisma.banner.create({
        data: {
          title,
          imageUrl: publicR2Url(key), // imageUrl es requerido → usamos la pública de R2
          imageKey: key,
          linkUrl,
          isActive,
          placement,
          categoryId,
          startAt,
          endAt,
          sortOrder,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          banner: created,
          previewUrl: publicR2Url(key),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } else {
      // Imagen de producto
      const productId = intOrNull(form.get('productId'))!;
      const alt = strOrNull(form.get('alt'));
      const forceCover = parseBool(form.get('isCover'));

      // Calcular orden e isCover
      const existing = await prisma.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
        _count: true,
      });
      const isFirst = (existing?._count ?? 0) === 0;
      const sortOrder = (existing?._max?.sortOrder ?? -1) + 1;
      const isCover = isFirst || forceCover;

      // Crear registro
      const created = await prisma.productImage.create({
        data: {
          productId,
          key,
          alt,
          isCover,
          sortOrder,
          size: Number(file.size) || null,
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

      // Si marcamos portada y no es la primer
