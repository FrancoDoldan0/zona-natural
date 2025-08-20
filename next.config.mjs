// Habilita el contexto de Cloudflare cuando usas `next dev`
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
await setupDevPlatform();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'www.revistacabal.coop' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
    ],
  },
};

export default nextConfig;
