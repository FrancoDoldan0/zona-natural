// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Renderizar imágenes de R2 sin optimización de Next (robusto en Cloudflare Pages)
    unoptimized: true,
    // Si más adelante querés optimizar imágenes desde un dominio fijo de R2,
    // reemplazá "unoptimized: true" por "remotePatterns" (y borrá unoptimized):
    //
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'pub-*.r2.dev', // o tu dominio público exacto de R2
    //     pathname: '**',
    //   },
    // ],
  },
};

export default nextConfig;
