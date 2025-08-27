BEGIN TRANSACTION;

-- Tag si no existe (SQLite: requiere name UNIQUE, que ya lo tenés)
INSERT OR IGNORE INTO Tag (name) VALUES ('Orgánico');

-- Vincular en tabla puente (ProductTag tiene @@unique(productId,tagId), por eso OR IGNORE)
INSERT OR IGNORE INTO ProductTag (productId, tagId)
SELECT 8, t.id
FROM Tag t
WHERE t.name = 'Orgánico';

COMMIT;