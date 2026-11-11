-- Money tracker: pay-out date and repeat for savings goals (new columns only).
-- AlterTable
ALTER TABLE "MoneyCommitment" ADD COLUMN     "paidOutOn" DATE,
ADD COLUMN     "payoutDate" DATE,
ADD COLUMN     "payoutTxnId" TEXT,
ADD COLUMN     "repeatMonths" INTEGER;

