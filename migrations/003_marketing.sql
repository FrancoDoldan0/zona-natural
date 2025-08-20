-- 003_marketing.sql

-- Imágenes de producto
CREATE TABLE IF NOT EXISTS product_image (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  url TEXT NOT NULL,
  alt TEXT,
  "order" INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY(product_id) REFERENCES product(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_image_product ON product_image(product_id);

-- Banners
CREATE TABLE IF NOT EXISTS banner (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  active INTEGER DEFAULT 1,
  "order" INTEGER DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_banner_order ON banner("order");

-- Ofertas
CREATE TABLE IF NOT EXISTS offer (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT','AMOUNT')),
  discount_value INTEGER NOT NULL, -- % o centavos según discount_type
  start_at INTEGER,
  end_at INTEGER,
  product_id TEXT,
  category_id TEXT,
  created_at INTEGER,
  updated_at INTEGER,
  FOREIGN KEY(product_id) REFERENCES product(id) ON DELETE CASCADE,
  FOREIGN KEY(category_id) REFERENCES category(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_offer_active ON offer(start_at, end_at);
