// lib/prisma-edge.ts
import { getEnv } from '@/lib/cf-env';

// Sólo importamos el cliente Edge; la creación real será perezosa.
import { PrismaClient as PrismaClientEdge } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';

type PrismaEdge = ReturnType<typeof makeClient>;
let _client: PrismaEdge | null = null;

function makeClient() {
  // ⚠️ No validamos acá la URL; dejamos que Prisma lo haga cuando realmente se use.
  // En runtime Edge (Cloudflare), DATABASE_URL debe ser prisma://... (Accelerate/Data Proxy).
  const client = new PrismaClientEdge().$extends(withAccelerate());
  return client;
}

/**
 * Devuelve un proxy perezoso: el PrismaClient real se crea recién en el primer uso.
 * Esto evita que el build/SSG reviente validando DATABASE_URL.
 */
export function createPrisma() {
  const handler: ProxyHandler<any> = {
    get(_target, prop, _receiver) {
      if (!_client) {
        // Mensaje amistoso si estás sin Accelerate en runtime Edge
        const url = (getEnv().DATABASE_URL as string | undefined) ?? '';
        if (!url || !url.startsWith('prisma://')) {
          // No tirar error en build; sólo advierto en dev/server logs si llega a crearse sin url válida
          // (Cloudflare necesitará prisma:// en producción sí o sí)
          // console.warn('DATABASE_URL debería empezar con prisma:// (Prisma Accelerate/Data Proxy).');
        }
        _client = makeClient();
      }
      const value = (_client as any)[prop];
      return typeof value === 'function' ? value.bind(_client) : value;
    },
  };

  // Tipamos como PrismaEdge, pero devolvemos el proxy
  return new Proxy({}, handler) as unknown as PrismaEdge;
}
