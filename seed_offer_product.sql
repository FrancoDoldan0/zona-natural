BEGIN TRANSACTION;
DELETE FROM Offer WHERE title = '-20 en Yerba Orgánica (test)';
INSERT INTO Offer (title, discountType, discountVal, productId, startAt, endAt, createdAt, updatedAt)
VALUES ('-20 en Yerba Orgánica (test)', 'AMOUNT', 20, 8, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
COMMIT;
