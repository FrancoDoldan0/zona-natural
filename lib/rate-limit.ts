// lib/rate-limit.ts
// Rate limiter simple en memoria para Edge/Cloudflare.
// Nota: en workers puede reiniciarse en cold start; para algo más fuerte usar KV/DO.

export type RateLimitOptions = {
  /** Ventana en milisegundos (p.ej., 60_000 = 1 min) */
  windowMs: number;
  /** Máximas solicitudes permitidas por ventana */
  max: number;
};

type Counter = { hits: number; reset: number };

// Mapa en memoria por instancia/worker.
const store = new Map<string, Counter>();

function ipFrom(req: Request): string {
  const h = req.headers;
  return (
    h.get('cf-connecting-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

/** Construye una clave estable: ip + partes opcionales (ruta/acción/usuario/etc.) */
export function rateLimitKey(
  req: Request,
  ...parts: Array<string | number | undefined>
): string {
  return [ipFrom(req), ...parts.filter(Boolean)].join(':');
}

/** Consume 1 unidad del bucket de la clave. */
export function rateLimitConsume(
  key: string,
  opts: RateLimitOptions
): { ok: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const cur = store.get(key);

  if (!cur || now >= cur.reset) {
    const reset = now + opts.windowMs;
    const next: Counter = { hits: 1, reset };
    store.set(key, next);
    return { ok: true, remaining: opts.max - 1, reset };
    }

  if (cur.hits >= opts.max) {
    return { ok: false, remaining: 0, reset: cur.reset };
  }

  cur.hits += 1;
  return { ok: true, remaining: opts.max - cur.hits, reset: cur.reset };
}

/** Helper: aplica rate limit con key parts y devuelve resultado. */
export function enforceRateLimit(
  req: Request,
  parts: Array<string | number | undefined>,
  opts: RateLimitOptions
) {
  const key = rateLimitKey(req, ...parts);
  const res = rateLimitConsume(key, opts);
  return { key, ...res };
}

/** Export con el mismo nombre que usas en tus rutas (`{ rateLimit }`). */
export function rateLimit(
  req: Request,
  parts: Array<string | number | undefined>,
  opts: RateLimitOptions
) {
  return enforceRateLimit(req, parts, opts);
}
