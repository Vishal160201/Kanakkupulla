-- AlterTable
ALTER TABLE "InventoryProduct" ADD COLUMN     "packSize" DECIMAL(12,3),
ADD COLUMN     "packUnit" TEXT;

-- CreateTable
CREATE TABLE "ProduceItem" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceCollection" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProduceCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProducePayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "cashAmount" DECIMAL(12,2) NOT NULL,
    "creditDeducted" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "creditPaymentId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProducePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceBuyer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "place" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceBuyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceSale" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduceReceipt" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProduceReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProduceItem_shopId_isArchived_idx" ON "ProduceItem"("shopId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "ProduceItem_shopId_name_key" ON "ProduceItem"("shopId", "name");

-- CreateIndex
CREATE INDEX "ProduceCollection_shopId_date_idx" ON "ProduceCollection"("shopId", "date");

-- CreateIndex
CREATE INDEX "ProduceCollection_itemId_voidedAt_idx" ON "ProduceCollection"("itemId", "voidedAt");

-- CreateIndex
CREATE INDEX "ProduceCollection_customerId_voidedAt_idx" ON "ProduceCollection"("customerId", "voidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProducePayment_transactionId_key" ON "ProducePayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProducePayment_creditPaymentId_key" ON "ProducePayment"("creditPaymentId");

-- CreateIndex
CREATE INDEX "ProducePayment_customerId_voidedAt_idx" ON "ProducePayment"("customerId", "voidedAt");

-- CreateIndex
CREATE INDEX "ProducePayment_shopId_date_idx" ON "ProducePayment"("shopId", "date");

-- CreateIndex
CREATE INDEX "ProduceBuyer_shopId_name_idx" ON "ProduceBuyer"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProduceSale_transactionId_key" ON "ProduceSale"("transactionId");

-- CreateIndex
CREATE INDEX "ProduceSale_shopId_date_idx" ON "ProduceSale"("shopId", "date");

-- CreateIndex
CREATE INDEX "ProduceSale_itemId_voidedAt_idx" ON "ProduceSale"("itemId", "voidedAt");

-- CreateIndex
CREATE INDEX "ProduceSale_buyerId_idx" ON "ProduceSale"("buyerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProduceSale_shopId_saleNumber_key" ON "ProduceSale"("shopId", "saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProduceReceipt_transactionId_key" ON "ProduceReceipt"("transactionId");

-- CreateIndex
CREATE INDEX "ProduceReceipt_buyerId_voidedAt_idx" ON "ProduceReceipt"("buyerId", "voidedAt");

-- CreateIndex
CREATE INDEX "ProduceReceipt_shopId_date_idx" ON "ProduceReceipt"("shopId", "date");

-- AddForeignKey
ALTER TABLE "ProduceItem" ADD CONSTRAINT "ProduceItem_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceCollection" ADD CONSTRAINT "ProduceCollection_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceCollection" ADD CONSTRAINT "ProduceCollection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProduceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceCollection" ADD CONSTRAINT "ProduceCollection_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "InventoryCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducePayment" ADD CONSTRAINT "ProducePayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducePayment" ADD CONSTRAINT "ProducePayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "InventoryCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducePayment" ADD CONSTRAINT "ProducePayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducePayment" ADD CONSTRAINT "ProducePayment_creditPaymentId_fkey" FOREIGN KEY ("creditPaymentId") REFERENCES "CustomerPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceBuyer" ADD CONSTRAINT "ProduceBuyer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceSale" ADD CONSTRAINT "ProduceSale_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceSale" ADD CONSTRAINT "ProduceSale_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProduceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceSale" ADD CONSTRAINT "ProduceSale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "ProduceBuyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceSale" ADD CONSTRAINT "ProduceSale_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceReceipt" ADD CONSTRAINT "ProduceReceipt_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceReceipt" ADD CONSTRAINT "ProduceReceipt_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "ProduceBuyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduceReceipt" ADD CONSTRAINT "ProduceReceipt_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Pack types: products now hold a pack type (Bottle / Packet / Bag / Loose / Piece) plus the
-- pack's size. Old per-measure units become Loose products sold by that measure.
UPDATE "InventoryProduct" SET "unit" = 'Loose', "packUnit" = 'kg' WHERE "unit" = 'Kg';
UPDATE "InventoryProduct" SET "unit" = 'Loose', "packUnit" = 'L' WHERE "unit" = 'Litre';
UPDATE "InventoryProduct" SET "unit" = 'Loose', "packUnit" = 'tonne' WHERE "unit" = 'Tonne';
-- Bags are always weighed in kg; their size is entered later ("size not set" until then).
UPDATE "InventoryProduct" SET "packUnit" = 'kg' WHERE "unit" = 'Bag' AND "packUnit" IS NULL;

-- First produce item for the fertilizer shop (more are added from the Produce tab).
INSERT INTO "ProduceItem" ("id", "shopId", "name", "unit", "isArchived", "createdAt", "updatedAt")
SELECT 'produce_manju_cotton', 'shop_manju_agency', 'Cotton', 'kg', false, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "Shop" WHERE "id" = 'shop_manju_agency')
ON CONFLICT DO NOTHING;

-- Produce ledger categories, added to a saved fertilizer Daily Kanakku layout (if one was saved;
-- otherwise the built-in default layout already lists them).
DO $$
DECLARE
  layout jsonb;
  opts jsonb;
  cat text;
  i int;
  j int;
BEGIN
  SELECT "schema"::jsonb INTO layout FROM "FormLayout" WHERE "formKey" = 'FERTILIZER_TRANSACTION_FORM';
  IF layout IS NULL OR jsonb_typeof(layout->'sections') <> 'array' THEN
    RETURN;
  END IF;
  FOR i IN 0 .. jsonb_array_length(layout->'sections') - 1 LOOP
    CONTINUE WHEN jsonb_typeof(layout->'sections'->i->'fields') <> 'array';
    FOR j IN 0 .. jsonb_array_length(layout->'sections'->i->'fields') - 1 LOOP
      IF layout->'sections'->i->'fields'->j->>'id' = 'fld_tx_category' THEN
        opts := COALESCE(layout->'sections'->i->'fields'->j->'options', '[]'::jsonb);
        FOREACH cat IN ARRAY ARRAY['Produce Sales', 'Produce Sale Collection', 'Produce Payment'] LOOP
          IF NOT opts ? cat THEN
            opts := opts || to_jsonb(cat);
          END IF;
        END LOOP;
        layout := jsonb_set(layout, ARRAY['sections', i::text, 'fields', j::text, 'options'], opts);
      END IF;
    END LOOP;
  END LOOP;
  UPDATE "FormLayout" SET "schema" = layout, "updatedAt" = NOW() WHERE "formKey" = 'FERTILIZER_TRANSACTION_FORM';
END $$;
