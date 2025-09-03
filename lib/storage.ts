import { mkdir, writeFile, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads');

const OK_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
function normalizeExt(ext: string) {
  ext = (ext || '').toLowerCase();
  if (ext === '.jpeg') return '.jpg';
  return ext;
}
function extFromType(type: string): string | undefined {
  const t = (type || '').toLowerCase();
  if (t.includes('jpeg') || t.includes('jpg')) return '.jpg';
  if (t.includes('png')) return '.png';
  if (t.includes('webp')) return '.webp';
  if (t.includes('gif')) return '.gif';
  if (t.includes('avif')) return '.avif';
  return undefined;
}
function extFromName(name?: string): string | undefined {
  if (!name) return undefined;
  const e = normalizeExt(extname(name));
  return OK_EXTS.has(e) ? e : undefined;
}
function safeName(base: string) {
  return (base || '')
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export async function saveProductImage(productId: number, file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = (file as any).name as string | undefined;
  const type = (file as any).type as string | undefined;

  const ext = extFromType(type || '') || extFromName(name) || '.jpg'; // fallback seguro
  const fname = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const dir = join(UPLOAD_ROOT, 'products', String(productId));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, safeName(fname)), buf);
  const rel = join('products', String(productId), safeName(fname)).replace(/\\/g, '/');
  const publicUrl = `/uploads/${rel}`;
  return { publicUrl, relPath: rel };
}

export async function deleteUpload(relPath: string) {
  const clean = String(relPath || '').replace(/^[/\\]+/, '');
  try {
    await unlink(join(UPLOAD_ROOT, clean));
  } catch {}
}
