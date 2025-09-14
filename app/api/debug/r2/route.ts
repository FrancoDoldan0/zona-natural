export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function GET() {
  try {
    const env: Record<string, any> = getRequestContext().env as any;
    const hasR2       = !!env?.R2 && typeof (env.R2 as any).put === 'function';
    const hasR2BUCKET = !!env?.R2_BUCKET && typeof (env.R2_BUCKET as any).put === 'function';
    const hasR2Bucket = !!env?.R2_Bucket && typeof (env.R2_Bucket as any).put === 'function';

    const publicBase = env?.PUBLIC_R2_BASE_URL ?? null;

    return NextResponse.json({
      ok: true,
      bindings: { hasR2, hasR2BUCKET, hasR2Bucket },
      publicBase,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
