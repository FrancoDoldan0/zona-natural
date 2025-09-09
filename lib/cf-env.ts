// lib/cf-env.ts
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Declaración tipada de todas las env/bindings que usás en Edge.
 * Podés seguir agregando claves; el index signature evita romper tipos.
 */
export type RuntimeEnv = {
  DATABASE_URL?: string;
  JWT_SECRET?: string;

  // WhatsApp
  WA_PHONE?: string;
  WHATSAPP_PHONE?: string; // legacy

  // R2 público
  PUBLIC_R2_BASE_URL?: string;

  // Para lib/site.ts
  SITE_NAME?: string;
  SITE_URL?: string;
  CURRENCY?: string;

  /** Permite claves adicionales sin romper el type-check */
  [key: string]: unknown;
};

export function getEnv(): RuntimeEnv {
  try {
    // En Cloudflare Workers/Pages (runtime edge)
    return getRequestContext().env as RuntimeEnv;
  } catch {
    // En build/dev/tests fuera del edge
    return (typeof process !== "undefined"
      ? (process.env as unknown as RuntimeEnv)
      : ({} as RuntimeEnv));
  }
}
