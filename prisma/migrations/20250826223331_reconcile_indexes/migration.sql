-- Baseline de hotfix aplicado manualmente en la DB.
-- Índice ya existente: ProductTag(tagId)
-- Esta migración se marcará como 'aplicada' sin ejecutar SQL.
-- (Si alguna vez la ejecutaras en otra DB, crearía el índice.)
CREATE INDEX "idx_ProductTag_tagId" ON "ProductTag"("tagId");
