-- Money columns: double precision -> numeric(12,2). Values are rounded to 2 decimal places.
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_bookingId_fkey";

-- DropIndex
DROP INDEX "Transaction_transactionId_idx";

-- DropIndex
DROP INDEX "Invoice_bookingId_idx";

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "package" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "advance" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "due" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "ProductOrder" ALTER COLUMN "discountAmount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
-- Convert in place instead of drop/add so existing priorities are kept; unknown values become NORMAL.
ALTER TABLE "Notification" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "Notification" ALTER COLUMN "priority" SET DATA TYPE "NotificationPriority"
  USING (CASE WHEN "priority" IN ('HIGH', 'NORMAL', 'LOW') THEN "priority" ELSE 'NORMAL' END)::"NotificationPriority";
ALTER TABLE "Notification" ALTER COLUMN "priority" SET DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "CategoryBudget" ALTER COLUMN "monthlyLimit" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "InvoiceLineItem" ALTER COLUMN "rate" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Booking_createdById_idx" ON "Booking"("createdById");

-- CreateIndex
CREATE INDEX "Booking_updatedById_idx" ON "Booking"("updatedById");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "RecycleBin_itemType_itemId_idx" ON "RecycleBin"("itemType", "itemId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

