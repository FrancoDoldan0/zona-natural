// app/(public)/sobre-nosotros/page.tsx
export const runtime = "edge";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sobre nosotros – Zona Natural",
  description:
    "Conocé la historia de Zona Natural: productos naturales, saludables y ricos para tu día a día.",
};

export default function SobreNosotrosPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 prose prose-emerald">
      <h1>Sobre nosotros</h1>
      <p>
        En <strong>Zona Natural</strong> creemos que lo simple es lo que mejor hace bien.
        Trabajamos con marcas y productores que comparten nuestros valores para acercarte
        productos naturales, saludables y ricos.
      </p>
      <h2>Nuestra historia</h2>
      <p>
        Nacimos con la idea de facilitar el acceso a alimentos reales y opciones más
        conscientes para todos los días. Empezamos con un catálogo chico y hoy seguimos
        creciendo gracias a tu confianza, manteniendo el foco en la calidad y la atención.
      </p>
      <h2>Qué nos mueve</h2>
      <ul>
        <li>Selección cuidada de productos y precios justos.</li>
        <li>Servicio cercano y envíos ágiles en Montevideo.</li>
        <li>Comunicación clara de ingredientes y orígenes.</li>
      </ul>
      <p>
        Gracias por acompañarnos. Si querés escribirnos, estamos en{" "}
        <a href="https://wa.me/59899608808" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        .
      </p>
    </main>
  );
}
