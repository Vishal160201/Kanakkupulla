-- AlterEnum
ALTER TYPE "ShopType" ADD VALUE 'CABLE';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "lowWalletAlert" DECIMAL(12,2),
ADD COLUMN     "syncKeyHash" TEXT,
ADD COLUMN     "syncedAt" TIMESTAMP(3),
ADD COLUMN     "upiId" TEXT,
ADD COLUMN     "walletBalance" DECIMAL(12,2),
ADD COLUMN     "walletSyncedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CableSubscriber" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "altPhone" TEXT,
    "status" TEXT NOT NULL,
    "plan" TEXT,
    "macId" TEXT,
    "address" TEXT,
    "area" TEXT,
    "createdOn" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "renewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "goneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CableSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CableRenewal" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "plan" TEXT,
    "amount" DECIMAL(12,2),
    "renewedAt" TIMESTAMP(3),
    "previousExpiry" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CableRenewal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CablePlan" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CablePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CablePayment" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMode" TEXT NOT NULL,
    "notes" TEXT,
    "transactionId" TEXT,
    "createdById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CableComplaint" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "notes" TEXT,
    "assignedToId" TEXT,
    "createdById" TEXT,
    "fixedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CableComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CableSubscriber_shopId_expiresAt_idx" ON "CableSubscriber"("shopId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CableSubscriber_shopId_provider_externalId_key" ON "CableSubscriber"("shopId", "provider", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CableRenewal_subscriberId_expiresAt_key" ON "CableRenewal"("subscriberId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CablePlan_shopId_provider_name_key" ON "CablePlan"("shopId", "provider", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CablePayment_transactionId_key" ON "CablePayment"("transactionId");

-- CreateIndex
CREATE INDEX "CablePayment_shopId_date_idx" ON "CablePayment"("shopId", "date");

-- CreateIndex
CREATE INDEX "CablePayment_subscriberId_voidedAt_idx" ON "CablePayment"("subscriberId", "voidedAt");

-- CreateIndex
CREATE INDEX "CableComplaint_shopId_fixedAt_idx" ON "CableComplaint"("shopId", "fixedAt");

-- CreateIndex
CREATE INDEX "CableComplaint_subscriberId_idx" ON "CableComplaint"("subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_syncKeyHash_key" ON "Shop"("syncKeyHash");

-- AddForeignKey
ALTER TABLE "CableSubscriber" ADD CONSTRAINT "CableSubscriber_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableRenewal" ADD CONSTRAINT "CableRenewal_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "CableSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePlan" ADD CONSTRAINT "CablePlan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePayment" ADD CONSTRAINT "CablePayment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePayment" ADD CONSTRAINT "CablePayment_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "CableSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CablePayment" ADD CONSTRAINT "CablePayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableComplaint" ADD CONSTRAINT "CableComplaint_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CableComplaint" ADD CONSTRAINT "CableComplaint_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "CableSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Existing roles get the new Cable & Internet module (Staff collect renewal payments, like fertilizer inventory)
UPDATE "AccessRole" SET "permissions" = "permissions" || '{"cable":"MANAGE"}'::jsonb;
