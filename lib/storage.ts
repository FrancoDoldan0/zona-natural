// lib/storage.ts
import { getRequestContext } from '@cloudflare/next-on-pages';

type EnvAny = Record<string, any>;

function getEnv(): EnvAny {
  const { env } = getRequestContext();
  return env as EnvAny;
}

function resolveR2Binding(env: EnvAny): R2Bucket | undefined {
  return (
    env.R2 ??           // recomendado en Pages
    env.R2_BUCKET ??    // alias común
    env.R2_Bucket ??    // por si lo crearon con camel case
    env.r2 ??           // otras variantes
    env.bucket ??
    env.BUCKET
  );
}

function getR2(): R2Bucket {
  const env = getEnv();
  const r2 = resolveR2Binding(env);
  if (!r2 || typeof (r2 as any).put !== 'function') {
    throw new Error('R2 binding missing: creá un binding en Pages llamado "R2" (o "R2_BUCKET").');
  }
  return r2 as R2Bucket;
}

export function publicR2Url(key: string): string {
  const env = getEnv();
  const base = (env.PUBLIC_R2_BASE_URL ||
                env.PUBLIC_ASSETS_BASE_URL ||
                env.ASSETS_BASE_URL) as string | undefined;

  if (!base) return key;
  const b = base.replace(/\/+$/, '');
  const k = String(key).replace(/^\/+/, '');
  return `${b}/${k}`;
}

export async function r2Put(
  key: string,
  value: ReadableStream | ArrayBuffer | Blob,
  contentType?: string
) {
  const R2 = getR2();
  const opts = contentType ? { httpMetadata: { contentType } } : undefined;
  await R2.put(key, value as any, opts);
  return publicR2Url(key);
}

export async function r2Delete(key: string) {
  const R2 = getR2();
  await R2.delete(key);
}

export async function r2List(prefix: string, limit = 1000) {
  const R2 = getR2();
  const res = await R2.list({ prefix, limit });
  return res.objects.map((o: any) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
    etag: o.etag,
  }));
}
