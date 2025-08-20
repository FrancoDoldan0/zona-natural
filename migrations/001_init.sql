-- Admin y sesiones
CREATE TABLE IF NOT EXISTS admin_user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  last_login_at INTEGER,
  failed_login_count INTEGER DEFAULT 0,
  locked_until INTEGER,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  expires_at INTEGER NOT NULL,
  rotated_from_id TEXT,
  ip TEXT,
  user_agent TEXT,
  FOREIGN KEY(admin_user_id) REFERENCES admin_user(id)
);
CREATE INDEX IF NOT EXISTS idx_session_admin ON session(admin_user_id);

-- Catálogo mínimo para el seed
CREATE TABLE IF NOT EXISTS category (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS subcategory (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY(category_id) REFERENCES category(id) ON DELETE CASCADE
);
