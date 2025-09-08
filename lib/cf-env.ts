import { getRequestContext } from "@cloudflare/next-on-pages";
export type RuntimeEnv = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  WA_PHONE?: string;
};
export function getEnv(): RuntimeEnv {
  try { return getRequestContext().env as RuntimeEnv; }
  catch { return (typeof process !== "undefined" ? (process.env as any) : {}) || {}; }
}