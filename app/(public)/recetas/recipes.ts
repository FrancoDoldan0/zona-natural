// Dataset simple y estable para /recetas

export type Recipe = {
  slug: string;
  title: string;
  desc: string;
  mins: number;
  img: string;        // URL absoluta (https) o relativa si existe en /public
  heroAlt?: string;
  ingredients: string[];
  steps: string[];
};

export const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&auto=format&fit=crop&w=1600&ixlib=rb-4.0.3";

// 3 recetas de ejemplo con imágenes reales (Unsplash)
export const recipes: Recipe[] = [
  {
    slug: "budin-de-banana-integral",
    title: "Budín de banana integral",
    desc: "Una opción húmeda y nutritiva ideal para la merienda.",
    mins: 45,
    img:
      "https://images.unsplash.com/photo-1607958996333-52dfd3fe4ac3?q=80&auto=format&fit=crop&w=1600&ixlib=rb-4.0.3",
    heroAlt: "Budín integral de banana",
    ingredients: [
      "2 bananas maduras",
      "2 huevos",
      "1/3 taza de aceite",
      "1/2 taza de azúcar mascabo",
      "1 taza de harina integral",
      "1 cdita de polvo de hornear",
      "Pizca de sal",
    ],
    steps: [
      "Pisá las bananas y mezclá con huevos, aceite y azúcar.",
      "Agregá secos tamizados e integrá sin batir de más.",
      "Horneá 35–40 min a 180 °C en molde aceitado.",
    ],
  },
  {
    slug: "galletitas-de-avena-y-miel",
    title: "Galletitas de avena y miel",
    desc: "Crocanes por fuera, tiernas por dentro.",
    mins: 25,
    img:
      "https://images.unsplash.com/photo-1551024709-8f23befc6cf7?q=80&auto=format&fit=crop&w=1600&ixlib=rb-4.0.3",
    heroAlt: "Galletitas de avena y miel",
    ingredients: [
      "1 taza de avena",
      "1/2 taza de harina",
      "1/4 taza de miel",
      "1 huevo",
      "2 cdas de aceite",
      "1 cdita de esencia de vainilla",
    ],
    steps: [
      "Mezclá todos los ingredientes hasta formar una masa pegajosa.",
      "Formá bolitas, aplaná en placa engrasada.",
      "Horneá 10–12 min a 180 °C.",
    ],
  },
  {
    slug: "panqueques-integrales",
    title: "Panqueques integrales",
    desc: "Livianos y rendidores para salados o dulces.",
    mins: 30,
    img:
      "https://images.unsplash.com/photo-1554104707-5f25c11f2c54?q=80&auto=format&fit=crop&w=1600&ixlib=rb-4.0.3",
    heroAlt: "Panqueques integrales apilados",
    ingredients: [
      "1 taza de harina integral",
      "1 taza de leche",
      "1 huevo",
      "1 cda de aceite",
      "Pizca de sal",
    ],
    steps: [
      "Batí todos los ingredientes y descansá 10 min.",
      "Cociná porciones finas en sartén antiadherente.",
      "Rellená a gusto; serví calientes.",
    ],
  },
];
