// components/landing/InfoBar.tsx
// Server Component: sin handlers ni estado.
function IconPhone(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M6.6 10.2c1.2 2.4 3.1 4.3 5.5 5.5l2-2a1 1 0 0 1 1-.25c1.1.36 2.3.55 3.5.55a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1C11.4 20 4 12.6 4 3a1 1 0 0 1 1-1h3.95a1 1 0 0 1 1 1c0 1.2.19 2.4.55 3.5a1 1 0 0 1-.25 1l-2 2Z"/>
    </svg>
  );
}
function IconWhatsApp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12.04 2a9.96 9.96 0 0 0-8.63 14.86L2 22l5.3-1.35A10 10 0 1 0 12.04 2Zm0 2a8 8 0 1 1-3.96 14.93l-.28-.16-3.06.78.81-2.98-.18-.31A8 8 0 0 1 12.04 4Zm-3.1 4.5c.18 0 .41-.01.63.48.23.5.79 1.74.86 1.86.07.12.1.27-.01.44-.11.16-.16.27-.32.44-.16.18-.34.4-.14.77.2.36.9 1.49 1.94 2.41 1.34 1.18 2.47 1.37 2.83 1.21.36-.16.58-.53.74-.86.16-.34.34-.29.57-.2.23.09 1.45.68 1.7.8.25.12.41.18.47.29.06.11.06.62-.15 1.21-.2.59-1.18 1.12-1.65 1.17-.47.05-1.02.16-3.43-.7-2.9-1.08-4.77-3.77-4.92-3.95-.15-.18-1.17-1.56-1.17-2.98 0-1.41.72-2.11.97-2.4.25-.29.55-.33.73-.33Z"/>
    </svg>
  );
}
function IconInstagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5ZM18 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1Z"/>
    </svg>
  );
}
function IconFacebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M13 10h3l-.4 3H13v9h-3v-9H8v-3h2V8a4 4 0 0 1 4-4h2v3h-2c-.55 0-1 .45-1 1v2Z"/>
    </svg>
  );
}

export default function InfoBar() {
  return (
    <div className="bg-emerald-800 text-white text-sm">
      <div className="mx-auto max-w-7xl px-4 py-2 flex items-center gap-4">
        <a href="tel:+59897531583" className="inline-flex items-center gap-2 hover:opacity-90">
          <IconPhone className="w-4 h-4" />
          <span>+598 97 531 583</span>
        </a>

        <div className="mx-auto hidden md:block">
          Envios a todo el país
        </div>

        <div className="ml-auto flex items-center gap-3">
          <a
            href="https://wa.me/59897531583"
            aria-label="WhatsApp"
            className="hover:opacity-90"
          >
            <IconWhatsApp className="w-5 h-5" />
          </a>
          <a
            href="https://www.instagram.com/zonanatural.uy/?hl=es"
            aria-label="Instagram"
            className="hover:opacity-90"
          >
            <IconInstagram className="w-5 h-5" />
          </a>
          <a
            href="https://www.facebook.com/"
            aria-label="Facebook"
            className="hover:opacity-90"
          >
            <IconFacebook className="w-5 h-5" />
          </a>
        </div>
      </div>
    </div>
  );
}
