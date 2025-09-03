export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site';

export async function GET() {
  const body = ['User-agent: *', 'Allow: /', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');

  return new NextResponse(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=86400',
    },
  });
}
