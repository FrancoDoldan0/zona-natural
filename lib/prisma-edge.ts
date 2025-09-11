// lib/prisma-edge.ts
import { getEnv } from '@/lib/cf-env'
import { PrismaClient as PrismaClientEdge } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

/**
 * Crea el cliente Prisma para Edge con Accelerate.
 * Usamos datasourceUrl explícito para no depender del proceso
 * y permitir que CF Pages/Workers inyecte correctamente el valor.
 */
function makeClient() {
  const url =
    (getEnv().DATABASE_URL as string | undefined) ??
    (process.env.DATABASE_URL as string | undefined)

  // NO forzamos validación acá; si falta o es inválida, Prisma lo dirá en el primer query.
  return new PrismaClientEdge({
    datasourceUrl: url,
  }).$extends(withAccelerate())
}

type PrismaEdge = ReturnType<typeof makeClient>
let _client: PrismaEdge | null = null

/**
 * Devuelve un Proxy del cliente. El Prisma real se instancia
 * recién en el primer acceso a una propiedad/método.
 */
export function createPrisma() {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (!_client) {
        // Aviso amistoso: en producción (Edge) debería ser prisma://...
        const url =
          (getEnv().DATABASE_URL as string | undefined) ??
          (process.env.DATABASE_URL as string | undefined) ??
          ''
        if (!url || !url.startsWith('prisma://')) {
          // No tiramos error en build/preview; sólo advertimos si hace falta.
          // console.warn('DATABASE_URL debería empezar con prisma:// (Prisma Accelerate/Data Proxy).')
        }
        _client = makeClient()
      }
      const value = (_client as any)[prop]
      return typeof value === 'function' ? value.bind(_client) : value
    },
  }

  // Tipamos como PrismaEdge, pero devolvemos el proxy
  return new Proxy({}, handler) as unknown as PrismaEdge
}

/**
 * Export nombrado + default para cubrir ambos estilos de import:
 *   import { prisma } from '@/lib/prisma-edge'
 *   import prisma from '@/lib/prisma-edge'
 */
export const prisma = createPrisma()
export default prisma
