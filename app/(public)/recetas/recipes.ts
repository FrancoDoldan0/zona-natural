// app/(public)/recetas/recipes.ts
export type Recipe = {
  slug: string;
  title: string;
  image: string;          // usamos imágenes remotas (no hace falta config)
  intro: string;
  time: string;           // ej: "15 min"
  serves: string;         // ej: "2 porciones"
  ingredients: string[];
  steps: string[];
};

export const RECIPES: Recipe[] = [
  {
    slug: "granola-casera",
    title: "Granola casera crocante",
    image:
      "https://images.unsplash.com/photo-1517673400267-0251440c45dc?q=80&w=1200&auto=format&fit=crop",
    intro:
      "Granola tostada con frutos secos y semillas: perfecta para yogur o leche.",
    time: "20 min",
    serves: "6 porciones",
    ingredients: [
      "2 tazas de avena",
      "1/2 taza de almendras picadas",
      "1/3 taza de semillas (chía, girasol o sésamo)",
      "2 cdas de miel",
      "2 cdas de aceite de coco",
      "Pizca de sal",
    ],
    steps: [
      "Precalentar el horno a 160°C.",
      "Mezclar avena, frutos secos y semillas en un bowl.",
      "Agregar miel, aceite de coco y sal, integrar bien.",
      "Extender en placa y hornear 12–15 min, revolviendo a mitad de cocción.",
      "Dejar enfriar y guardar en frasco hermético.",
    ],
  },
  {
    slug: "panqueques-de-avena",
    title: "Panqueques de avena",
    image:
      "https://images.unsplash.com/photo-1495214783159-3503fd1b572d?q=80&w=1200&auto=format&fit=crop",
    intro:
      "Livianos y sabrosos, ideales para desayunos con fruta o miel.",
    time: "15 min",
    serves: "2 porciones",
    ingredients: [
      "1 taza de avena molida",
      "1 huevo",
      "1/2 taza de leche",
      "1 cdita de polvo de hornear",
      "1 cdita de vainilla",
      "Pizca de sal",
    ],
    steps: [
      "Mezclar ingredientes hasta lograr una masa fluida.",
      "Calentar sartén antiadherente y verter pequeñas porciones.",
      "Cocinar 1–2 min por lado. Servir con fruta o miel.",
    ],
  },
  {
    slug: "smoothie-verde-detox",
    title: "Smoothie verde detox",
    image:
      "https://images.unsplash.com/photo-1524594227086-79f2a34a9a0e?q=80&w=1200&auto=format&fit=crop",
    intro:
      "Refrescante y nutritivo, con espinaca, manzana y limón.",
    time: "5 min",
    serves: "1 vaso grande",
    ingredients: [
      "1 taza de espinaca",
      "1 manzana verde",
      "1/2 banana",
      "Jugo de 1/2 limón",
      "1 taza de agua fría o hielo",
    ],
    steps: [
      "Llevar todo a la licuadora.",
      "Procesar hasta que quede bien liso.",
      "Servir inmediatamente.",
    ],
  },
  {
    slug: "galletas-de-avena",
    title: "Galletas de avena",
    image:
      "https://images.unsplash.com/photo-1548943487-a2e4e43b4856?q=80&w=1200&auto=format&fit=crop",
    intro:
      "Clásicas galletas crujientes por fuera y tiernas por dentro.",
    time: "25 min",
    serves: "12 unidades",
    ingredients: [
      "1 1/2 taza de avena",
      "1/2 taza de harina",
      "1/3 taza de azúcar mascabo",
      "1/3 taza de aceite o manteca",
      "1 huevo",
      "1 cdita de vainilla",
      "Pizca de sal",
    ],
    steps: [
      "Precalentar horno a 180°C.",
      "Mezclar secos por un lado y húmedos por otro. Unir.",
      "Formar bolitas y aplastar en placa con papel manteca.",
      "Hornear 10–12 min hasta dorar bordes. Enfriar en rejilla.",
    ],
  },
];
