// lib/storage.ts
import { getRequestContext } from '@cloudflare/next-on-pages';

function getEnv() {
  const { env } = getRequestContext();
  return env as unknown as { R2: R2Bucket; PUBLIC_R2_BASE_URL?: string };
}

export function publicR2Url(key: string): string {
  const base = getEnv().PUBLIC_R2_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/${key}` : key; // fallback simple
}

export async function r2Put(
  key: string,
  value: ReadableStream | ArrayBuffer | Blob,
  contentType?: string
) {
  const { R2 } = getEnv();
  await R2.put(key, value as any, { httpMetadata: { contentType } });
  return publicR2Url(key);
}

export async function r2Delete(key: string) {
  const { R2 } = getEnv();
  await R2.delete(key);
}

export async function r2List(prefix: string, limit = 1000) {
  const { R2 } = getEnv();
  const res = await R2.list({ prefix, limit });
  return res.objects.map(o => ({ key: o.key, size: o.size, uploaded: o.uploaded, etag: o.etag }));
}

/**
 * Borra un objeto del bucket R2.
 * No falla si no existe o si no hay binding en dev.
 */
export async function deleteUpload(key: string): Promise<void> {
  const env = (typeof getRequestContext === 'function' ? getRequestContext().env : undefined) as
    | { R2_BUCKET?: { delete: (k: string) => Promise<any> } }
    | undefined;

  await env?.R2_BUCKET?.delete(key).catch(() => {});
}
