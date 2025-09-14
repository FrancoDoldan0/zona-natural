// app/api/debug/r2/route.ts
export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

function pickR2(env: Record<string, any> | undefined): R2Bucket | undefined {
  if (!env) return undefined;
  return (env as any).R2 || (env as any).R2_BUCKET || (env as any).r2 || (env as any).bucket;
}

export async function GET(req: Request) {
  try {
    const ctx = getRequestContext() as { env?: Record<string, any> } | undefined;
    const env = ctx?.env;
    const r2 = pickR2(env);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';
    const prefix = url.searchParams.get('prefix') || 'debug/';
    const verbose = url.searchParams.get('verbose') === '1';

    const info: any = {
      ok: true,
      // Qué nombres de posibles bindings existen
      r2BindingNames: Object.keys(env ?? {}).filter((k) => /(^R2$|^R2_|_R2$|R2_BUCKET)/i.test(k)),
      hasR2: !!r2,
      PUBLIC_R2_BASE_URL: env?.PUBLIC_R2_BASE_URL ?? null,
      // Para ver si estamos en Pages Functions y qué llega realmente
      envKeysCount: Object.keys(env ?? {}).length,
      sampleEnvKeys: Object.keys(env ?? {}).slice(0, 15),
    };

    if (!r2) {
      return NextResponse.json(
        { ok: false, error: 'no_r2_binding', ...info },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (action === 'put') {
      const key = `${prefix}${Date.now()}-hello.txt`;
      const blob = new Blob([`hello from /api/debug/r2 at ${new Date().toISOString()}\n`], {
        type: 'text/plain',
      });
      await r2.put(key, blob, { httpMetadata: { contentType: 'text/plain' } });
      info.put = { key, hint: 'si tenés PUBLIC_R2_BASE_URL, la URL pública sería base + "/" + key' };
    }

    const listed = await r2.list({ prefix, limit: 10 });
    info.list = listed.objects.map((o) => ({
      key: o.key,
      size: o.size,
      uploaded: o.uploaded,
    }));

    if (verbose) info.envAllKeys = Object.keys(env ?? {}); // solo si verbose=1

    return NextResponse.json(info, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: 'debug_failed', detail: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
