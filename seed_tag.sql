BEGIN TRANSACTION;
-- crea tag si no existe (SQLite: INSERT OR IGNORE requiere unique en name)
INSERT OR IGNORE INTO Tag (name, createdAt, updatedAt)
VALUES ('Orgánico', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- vincula al producto por slug
INSERT INTO ProductTag (productId, tagId)
SELECT p.id, t.id
FROM Product p, Tag t
WHERE p.slug = 'yerba-organica-500g-v2' AND t.name = 'Orgánico'
  AND NOT EXISTS (
    SELECT 1 FROM ProductTag pt WHERE pt.productId = p.id AND pt.tagId = t.id
  );
COMMIT;
