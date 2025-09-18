// lib/storage.ts
import { getRequestContext } from '@cloudflare/next-on-pages';

// Tipos suaves para no depender de workers-types en tiempo de build
type EnvAny = Record<string, unknown>;
type R2BucketLike = {
  put?: (key: string, value: any, opts?: any) => Promise<any>;
  delete?: (key: string) => Promise<any>;
  list?: (opts?: any) => Promise<{
    objects: Array<{ key: string; size: number; uploaded: string; etag: string }>;
  }>;
};

// ---------- helpers de entorno (seguros en Edge) ----------
function safeGetEnv(): EnvAny {
  // En Cloudflare Pages Functions, getRequestContext está disponible.
  // Si por algún motivo no lo está (SSR, prerender, etc.), devolvemos un objeto vacío.
  try {
    const ctx = getRequestContext();
    return (ctx?.env ?? {}) as EnvAny;
  } catch {
    return {};
  }
}

function resolveR2Binding(env: EnvAny): R2BucketLike | undefined {
  return (
    (env as any).R2 ?? // recomendado en Pages
    (env as any).R2_BUCKET ?? // alias común
    (env as any).R2_Bucket ?? // por si lo crearon con camel case
    (env as any).r2 ?? // otras variantes
    (env as any).bucket ??
    (env as any).BUCKET
  );
}

function getR2(): R2BucketLike {
  const env = safeGetEnv();
  const r2 = resolveR2Binding(env);
  if (!r2 || typeof r2.put !== 'function') {
    throw new Error('R2 binding missing: creá un binding en Pages llamado "R2" (o "R2_BUCKET").');
  }
  return r2;
}

// ---------- URLs públicas ----------
function isAbsoluteUrl(u?: string | null): boolean {
  return !!u && /^(?:https?:)?\/\//i.test(u);
}
function startsWithSlash(u?: string | null): boolean {
  return !!u && /^\//.test(u);
}

/**
 * Convierte una key de R2 a URL pública usando PUBLIC_R2_BASE_URL si está seteada.
 * - Si `key` ya es una URL absoluta (http/https) o empieza con "/", se retorna tal cual.
 * - Si no hay base pública configurada, se retorna la key original (el caller puede resolver).
 */
export function publicR2Url(key: string): string {
  if (!key) return key;
  if (isAbsoluteUrl(key) || startsWithSlash(key)) return key;

  const env = safeGetEnv();
  const base =
    (env as any).PUBLIC_R2_BASE_URL ||
    (env as any).PUBLIC_ASSETS_BASE_URL ||
    (env as any).ASSETS_BASE_URL;

  if (!base || typeof base !== 'string') return key;

  const b = base.replace(/\/+$/, '');
  const k = String(key).replace(/^\/+/, '');
  return `${b}/${k}`;
}

// ---------- helpers R2 (solo usados en panel/admin) ----------
export async function r2Put(
  key: string,
  value: ReadableStream | ArrayBuffer | Blob,
  contentType?: string,
) {
  const R2 = getR2();
  const opts = contentType ? { httpMetadata: { contentType } } : undefined;
  await R2.put!(key, value as any, opts);
  return publicR2Url(key);
}

export async function r2Delete(key: string) {
  const R2 = getR2();
  await R2.delete!(key);
}

export async function r2List(prefix: string, limit = 1000) {
  const R2 = getR2();
  const res = await R2.list!({ prefix, limit });
  return res.objects.map((o: any) => ({
    key: o.key,
    size: o.size,
    uploaded: o.uploaded,
    etag: o.etag,
  }));
}
