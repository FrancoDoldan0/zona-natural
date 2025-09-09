-- CreateIndex
CREATE INDEX "Offer_productId_idx" ON "Offer"("productId");

-- CreateIndex
CREATE INDEX "Offer_categoryId_idx" ON "Offer"("categoryId");

-- CreateIndex
CREATE INDEX "Offer_tagId_idx" ON "Offer"("tagId");

-- CreateIndex
CREATE INDEX "Offer_startAt_idx" ON "Offer"("startAt");

-- CreateIndex
CREATE INDEX "Offer_endAt_idx" ON "Offer"("endAt");
