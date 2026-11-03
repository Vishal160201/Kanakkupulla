-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "smsDeviceSeenAt" TIMESTAMP(3),
ADD COLUMN     "smsDeviceTokenHash" TEXT;

-- CreateTable
CREATE TABLE "OutboundSms" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "subscriberId" TEXT,
    "createdById" TEXT,
    "reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundSms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutboundSms_shopId_status_idx" ON "OutboundSms"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_smsDeviceTokenHash_key" ON "Shop"("smsDeviceTokenHash");

-- AddForeignKey
ALTER TABLE "OutboundSms" ADD CONSTRAINT "OutboundSms_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

