-- CreateEnum
CREATE TYPE "ShopType" AS ENUM ('STUDIO', 'FERTILIZER');

-- CreateEnum
CREATE TYPE "InventoryBillKind" AS ENUM ('PURCHASE', 'SALE');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "type" "ShopType" NOT NULL DEFAULT 'STUDIO';

-- CreateTable
CREATE TABLE "ShopMember" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryProduct" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryBill" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "kind" "InventoryBillKind" NOT NULL,
    "billNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "supplierName" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "billId" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCustomer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "place" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopMember_userId_idx" ON "ShopMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopMember_shopId_userId_key" ON "ShopMember"("shopId", "userId");

-- CreateIndex
CREATE INDEX "InventoryProduct_shopId_isArchived_idx" ON "InventoryProduct"("shopId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryProduct_shopId_name_key" ON "InventoryProduct"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBill_transactionId_key" ON "InventoryBill"("transactionId");

-- CreateIndex
CREATE INDEX "InventoryBill_shopId_kind_date_idx" ON "InventoryBill"("shopId", "kind", "date");

-- CreateIndex
CREATE INDEX "InventoryBill_customerId_idx" ON "InventoryBill"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBill_shopId_billNumber_key" ON "InventoryBill"("shopId", "billNumber");

-- CreateIndex
CREATE INDEX "StockMovement_shopId_date_idx" ON "StockMovement"("shopId", "date");

-- CreateIndex
CREATE INDEX "StockMovement_productId_voidedAt_idx" ON "StockMovement"("productId", "voidedAt");

-- CreateIndex
CREATE INDEX "StockMovement_billId_idx" ON "StockMovement"("billId");

-- CreateIndex
CREATE INDEX "InventoryCustomer_shopId_name_idx" ON "InventoryCustomer"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPayment_transactionId_key" ON "CustomerPayment"("transactionId");

-- CreateIndex
CREATE INDEX "CustomerPayment_customerId_voidedAt_idx" ON "CustomerPayment"("customerId", "voidedAt");

-- CreateIndex
CREATE INDEX "CustomerPayment_shopId_date_idx" ON "CustomerPayment"("shopId", "date");

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryProduct" ADD CONSTRAINT "InventoryProduct_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBill" ADD CONSTRAINT "InventoryBill_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBill" ADD CONSTRAINT "InventoryBill_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "InventoryCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBill" ADD CONSTRAINT "InventoryBill_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InventoryProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_billId_fkey" FOREIGN KEY ("billId") REFERENCES "InventoryBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCustomer" ADD CONSTRAINT "InventoryCustomer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "InventoryCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPayment" ADD CONSTRAINT "CustomerPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Seed the fertilizer shop (Manju agency). It is never the default shop.
INSERT INTO "Shop" ("id", "name", "icon", "color", "isArchived", "type", "createdAt", "updatedAt")
VALUES ('shop_manju_agency', 'Manju agency', 'plant', '#16a34a', false, 'FERTILIZER', NOW(), NOW())
ON CONFLICT DO NOTHING;
