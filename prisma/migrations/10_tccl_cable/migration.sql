-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "tcclSyncedAt" TIMESTAMP(3),
ADD COLUMN     "tcclWalletBalance" DECIMAL(12,2),
ADD COLUMN     "tcclWalletSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CableSubscriber" ADD COLUMN     "billedTotal" DECIMAL(12,2),
ADD COLUMN     "vcNumber" TEXT;

-- AlterTable
ALTER TABLE "CableRenewal" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'RENEWAL',
ALTER COLUMN "expiresAt" DROP NOT NULL;

