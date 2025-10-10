// app/(public)/recetas/recipes.ts
export type Recipe = {
  slug: string;
  title: string;
  desc?: string;
  time?: string;
  image?: string;
  ingredients: string[];
  steps: string[];
};

// Exportamos con el nombre EXACTO 'recipes'
export const recipes: Recipe[] = [
  {
    slug: "budin-de-banana-integral",
    title: "Budín de banana integral",
    desc: "Una opción húmeda y nutritiva ideal para la merienda.",
    time: "45 min",
    image: "/recetas/budin-banana.jpg",
    ingredients: [
      "2 bananas maduras",
      "2 huevos",
      "1/3 taza de aceite",
      "1/2 taza de azúcar mascabo",
      "1 y 1/2 taza de harina integral",
      "1 cdita de polvo de hornear",
      "1 pizca de canela (opcional)",
    ],
    steps: [
      "Pisar las bananas y mezclar con huevos, aceite y azúcar.",
      "Incorporar harina, polvo de hornear y canela.",
      "Volcar en budinera engrasada y hornear a 180°C por 35–40 min.",
    ],
  },
  {
    slug: "galletitas-de-avena-y-miel",
    title: "Galletitas de avena y miel",
    desc: "Crocanes por fuera, tiernas por dentro.",
    time: "25 min",
    image: "/recetas/avena-miel.jpg",
    ingredients: [
      "1 taza de avena",
      "1/2 taza de harina",
      "1/4 taza de miel",
      "1 huevo",
      "2 cdas de aceite",
      "1 cdita de esencia de vainilla",
    ],
    steps: [
      "Mezclar todos los ingredientes hasta obtener una masa pegajosa.",
      "Formar bolitas y aplastar en placa engrasada.",
      "Hornear 10–12 min a 180°C.",
    ],
  },
  {
    slug: "panqueques-integrales",
    title: "Panqueques integrales",
    desc: "Livianos y rendidores para salados o dulces.",
    time: "30 min",
    image: "/recetas/panqueques.jpg",
    ingredients: [
      "1 taza de harina integral",
      "1 huevo",
      "1 y 1/4 taza de leche",
      "1 pizca de sal",
      "1 cda de aceite (para la sartén)",
    ],
    steps: [
      "Batir harina, huevo, leche y sal hasta una mezcla lisa.",
      "Cocinar porciones en sartén antiadherente con un hilo de aceite.",
      "Rellenar y servir.",
    ],
  },
];
