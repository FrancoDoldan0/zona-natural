import { getEnv } from '@/lib/cf-env';

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.length > 0 ? v : fallback;
}

export const siteName = str(getEnv().SITE_NAME, 'Zona Natural');
export const siteUrl = str(getEnv().SITE_URL, 'http://localhost:3000').replace(/\/$/, '');
export const currency = str(getEnv().CURRENCY, 'ARS');
