BEGIN TRANSACTION;
DELETE FROM Offer WHERE title IN ('-20 en Yerba Orgánica (test)','Promo -25% categoría (test)');
COMMIT;
