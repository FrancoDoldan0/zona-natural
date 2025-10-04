// app/api/admin/banners/upload/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { publicR2Url } from '@/lib/storage';
// TIP: next-on-pages nos da acceso a env (R2 bindings) en Cloudflare Pages
import { getRequestContext } from '@cloudflare/next-on-pages';

// Evita errores de tipos si no tenés @cloudflare/workers-types
type R2Bucket = any;

function pickBucket(env: any): R2Bucket | null {
  if (!env) return null;
  // Probamos varios nombres comunes por si el binding tiene otro nombre
  return (
    env.R2 ||
    env.R2_BUCKET ||
    env.BANNERS ||
    env.ASSETS ||
    env.BUCKET ||
    env.r2 ||
    null
  );
}

function safeName(name?: string | null) {
  const base = (name || 'banner').toLowerCase();
  return base.replace(/[^a-z0-9.\-_]+/g, '-').replace(/^-+|-+$/g, '');
}

function rand(n = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  for (const b of buf) out += chars[b % chars.length];
  return out;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    // admitimos 'file' o 'image'
    const file = (form.get('file') || form.get('image')) as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'missing_file', detail: 'Esperaba campo "file" (o "image") en multipart/form-data.' },
        { status: 400 },
      );
    }

    const { env } = getRequestContext();
    const bucket = pickBucket(env);
    if (!bucket || typeof bucket.put !== 'function') {
      return NextResponse.json(
        { ok: false, error: 'r2_binding_missing', detail: 'No se encontró el binding R2 en el entorno.' },
        { status: 501 },
      );
    }

    const original = safeName(file.name);
    const extFromName = original.includes('.') ? original.split('.').pop()! : '';
    // preferimos extensión por MIME si es posible
    const mime = file.type || 'application/octet-stream';
    const extFromMime =
      mime.startsWith('image/') ? mime.split('/')[1]?.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    const ext = (extFromMime || extFromName || 'jpg').replace(/^\.+/, '');

    const key = `banners/${Date.now()}-${rand(6)}-${original.replace(/\.[^.]+$/, '')}.${ext}`;

    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const imageUrl = publicR2Url(key);
    return NextResponse.json({ ok: true, imageKey: key, imageUrl });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail: String(e?.message || e) },
      { status: 500 },
    );
  }
}
