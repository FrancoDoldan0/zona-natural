-- D:\zona-natural\migrations\002_products.sql

-- Tabla de productos
CREATE TABLE IF NOT EXISTS product (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_cents INTEGER,                  -- precio opcional (centavos)
  sku TEXT,                             -- opcional
  status TEXT NOT NULL DEFAULT 'ACTIVE',-- 'ACTIVE' | 'DRAFT'
  category_id TEXT NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  subcategory_id TEXT REFERENCES subcategory(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE INDEX IF NOT EXISTS idx_product_category ON product(category_id);
CREATE INDEX IF NOT EXISTS idx_product_subcategory ON product(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_product_status ON product(status);

-- Imágenes del producto
CREATE TABLE IF NOT EXISTS product_image (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  "order" INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_image_product ON product_image(product_id);
