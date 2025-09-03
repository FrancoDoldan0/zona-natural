// app/api/admin/uploads/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { r2Put } from '@/lib/storage';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
  const ip = req.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  if (!rateLimit(`upload:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const productId = String(form.get('productId') ?? 'misc');

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file is required (multipart/form-data)' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 });
  }

  const name = (file as any).name || 'upload.bin';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'bin';
  const key = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const url = await r2Put(key, file.stream(), (file as any).type || 'application/octet-stream');

  return NextResponse.json({ ok: true, key, url, size: file.size, type: (file as any).type || null });
}
