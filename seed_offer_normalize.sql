BEGIN TRANSACTION;
UPDATE Offer
SET startAt = NULL, endAt = NULL
WHERE title = '-20 en Yerba Orgánica (test)';
COMMIT;
