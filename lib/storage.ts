// lib/storage.ts
import { getRequestContext } from '@cloudflare/next-on-pages';

type EnvAny = Record<string, any>;

function getEnv(): EnvAny {
  const { env } = getRequestContext();
  return env as EnvAny;
}

function getR2(): R2Bucket {
  const env = getEnv();
  // Soportar varios nombres de binding
  const r2: R2Bucket | undefined =
    env.R2 || env.R2_BUCKET || env.r2 || env.bucket;

  if (!r2 || typeof (r2 as any).put !== 'function') {
    throw new Error(
      'R2 binding missing: creá un binding en Pages y llamalo "R2" (o usa "R2_BUCKET").'
    );
  }
  return r2;
}

export function publicR2Url(key: string): string {
  const env = getEnv();
  const base: string | undefined = env.PUBLIC_R2_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/${key}` : key;
}

export async function r2Put(
  key: string,
  value: ReadableStream | ArrayBuffer | Blob,
  contentType?: string
) {
  const R2 = getR2();
  await R2.put(
    key,
    value as any,
    contentType ? { httpMetadata: { contentType } } : undefined
  );
  return publicR2Url(key);
}

export async function r2Delete(key: string) {
  const R2 = getR2();
  await R2.delete(key);
}

export async function r2List(prefix: string, limit = 1000) {
  const R2 = getR2();
  const res = await R2.list({ prefix, limit });
  return res.objects.map((o) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
    etag: o.etag,
  }));
}
