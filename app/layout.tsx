// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

const CF_WEB_ANALYTICS_TOKEN = process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN;

export const metadata: Metadata = {
  title: {
    default: "Zona Natural",
    template: "%s • Zona Natural",
  },
  description: "Productos naturales, saludables y ricos.",
  themeColor: "#065f46",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
    shortcut: ["/icon.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-slate-50 text-slate-900 overflow-x-hidden">
        {children}

        {/* Cloudflare Web Analytics (solo si hay token configurado) */}
        {CF_WEB_ANALYTICS_TOKEN && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${CF_WEB_ANALYTICS_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
