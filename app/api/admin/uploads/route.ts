export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

function sniffMagic(buf: Uint8Array) {
  const b = (i: number) => buf[i];
  const ascii = (i: number, len: number) => String.fromCharCode(...buf.slice(i, i + len));
  // JPEG
  if (buf.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff)
    return { ext: '.jpg', mime: 'image/jpeg' };
  // PNG
  if (
    buf.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)
  )
    return { ext: '.png', mime: 'image/png' };
  // WebP: "RIFF....WEBP"
  if (buf.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP')
    return { ext: '.webp', mime: 'image/webp' };
  // AVIF: ftyp.... "avif"/"avis"
  if (buf.length >= 12 && ascii(4, 4) === 'ftyp' && ['avif', 'avis'].includes(ascii(8, 4)))
    return { ext: '.avif', mime: 'image/avif' };
  return null;
}

export async function POST(req: Request) {
  // Rate limit por IP (20/min)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const rl = await rateLimit(`upload:${ip}`, 20, 60_000);
  if (!rl.ok)
    return NextResponse.json({ ok: false, error: 'Too many uploads, try later.' }, { status: 429 });

  if (!req.headers.get('content-type')?.toLowerCase().includes('multipart/form-data')) {
    return NextResponse.json({ ok: false, error: 'Use multipart/form-data' }, { status: 415 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Field 'file' is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'File too large (max 5MB)' }, { status: 413 });
  }
  if (!ALLOWED.includes(file.type)) {
    // Seguimos chequeando magic bytes igual
  }

  const ab = await file.arrayBuffer();
  const buf = new Uint8Array(ab);
  const sig = sniffMagic(buf);
  if (!sig || !ALLOWED.includes(sig.mime)) {
    return NextResponse.json({ ok: false, error: 'Unsupported image type' }, { status: 415 });
  }

  // Carpeta destino: /public/uploads/YYYY/MM
  const now = new Date();
  const yy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const relDir = `/uploads/${yy}/${mm}`;
  const pubRoot = path.join(process.cwd(), 'public');
  const absDir = path.join(pubRoot, relDir);
  await fs.mkdir(absDir, { recursive: true });

  // Nombre aleatorio
  const name = `${Date.now().toString(36)}_${randomBytes(8).toString('hex')}${sig.ext}`;
  const absPath = path.join(absDir, name);

  // Seguridad: garantizar que queda bajo /public
  const real = path.resolve(absPath);
  if (!real.startsWith(pubRoot)) {
    return NextResponse.json({ ok: false, error: 'Invalid path' }, { status: 400 });
  }

  await fs.writeFile(real, buf);
  const url = path.posix.join(relDir, name); // /uploads/yy/mm/name.ext
  return NextResponse.json({ ok: true, url, bytes: file.size, type: sig.mime }, { status: 201 });
}
