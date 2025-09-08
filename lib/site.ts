import { getEnv } from '@/lib/cf-env';
export const siteName = getEnv().SITE_NAME || 'Zona Natural';
export const siteUrl = (getEnv().SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export const currency = getEnv().CURRENCY || 'ARS';
