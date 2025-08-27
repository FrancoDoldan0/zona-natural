BEGIN;
CREATE INDEX IF NOT EXISTS idx_ProductTag_tagId ON ProductTag(tagId);
COMMIT;