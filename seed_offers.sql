BEGIN TRANSACTION;

-- limpiar títulos de test previos
DELETE FROM Offer
WHERE title IN ('Promo -25% categoría (test)', '-20 en Yerba Orgánica (test)');

-- oferta por categoría (solo si el producto tiene categoría)
-- (producto sin categoría; se omite la oferta por categoría)

-- oferta por producto (usa productId directo y startAt -1min para evitar bordes)
INSERT INTO Offer (title, discountType, discountVal, productId, startAt, createdAt, updatedAt)
VALUES ('-20 en Yerba Orgánica (test)', 'AMOUNT', 20, 8, datetime('now','-1 minute'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

COMMIT;
