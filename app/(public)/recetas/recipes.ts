// app/(public)/recetas/recipes.ts
export type Recipe = {
  slug: string;
  title: string;
  desc: string;
  timeMin?: number;
  img?: string;
  heroAlt?: string;
  ingredients: string[];
  steps: string[];
};

export const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?q=80&w=1200&auto=format&fit=crop";

export const recipes: Recipe[] = [
  {
    slug: "budin-de-banana-integral",
    title: "Budín de banana integral",
    desc: "Una opción húmeda y nutritiva ideal para la merienda.",
    timeMin: 45,
    img: "https://m.ftscrt.com/static/recipe/9a63a850-219e-495c-83b1-0d7362ec1cbd_fs2.jpg",
    heroAlt: "Budín de banana integral casero",
    ingredients: [
      "2 bananas maduras",
      "2 huevos",
      "1/2 taza de azúcar mascabo",
      "1/3 taza de aceite",
      "1 taza de harina integral",
      "1 cdita de polvo de hornear",
    ],
    steps: [
      "Pisá las bananas y mezclalas con huevos, azúcar y aceite.",
      "Agregá harina y polvo de hornear hasta integrar.",
      "Volcá en budinera y horneá 35–40 min a 180°C.",
    ],
  },
  {
    slug: "galletitas-de-avena-y-miel",
    title: "Galletitas de avena y miel",
    desc: "Crocantes por fuera, tiernas por dentro.",
    timeMin: 25,
    img: "https://www.gourmet.cl/wp-content/uploads/2019/01/Galletas.jpg",
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
      "Mezclá todos los ingredientes hasta lograr una masa pegajosa.",
      "Formá bolitas y aplastá en placa engrasada.",
      "Horneá 10–12 min a 180°C.",
    ],
  },
  {
    slug: "panqueques-integrales",
    title: "Panqueques integrales",
    desc: "Livianos y rendidores para salados o dulces.",
    timeMin: 30,
    img: "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?q=80&w=1200&auto=format&fit=crop",
    heroAlt: "Panqueques integrales",
    ingredients: [
      "1 taza de harina integral",
      "1 huevo",
      "1 ½ taza de leche",
      "1 pizca de sal",
      "1 cda de aceite",
    ],
    steps: [
      "Batí todos los ingredientes hasta que no queden grumos.",
      "Cociná porciones finitas en sartén caliente antiadherente.",
      "Rellená a gusto y serví.",
    ],
  },
];

export default recipes;
