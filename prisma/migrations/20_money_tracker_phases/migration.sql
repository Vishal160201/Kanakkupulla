-- Money tracker, phases 2-10: card used amount, manual balances, card payments, rule
-- direction, commitment matching, preferences. ADD COLUMN IF NOT EXISTS: an early copy of
-- 19_money_tracker already had "outstanding" and "outstandingAsOf".
-- AlterTable
ALTER TABLE "MoneyAccount" ADD COLUMN IF NOT EXISTS "manualBalance" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "manualBalanceAsOf" DATE,
ADD COLUMN IF NOT EXISTS "outstanding" DECIMAL(14,2),
ADD COLUMN IF NOT EXISTS "outstandingAsOf" DATE;

-- AlterTable
ALTER TABLE "MoneyTransaction" ADD COLUMN IF NOT EXISTS "counterAccountId" TEXT,
ADD COLUMN IF NOT EXISTS "seq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "MoneyRule" ADD COLUMN IF NOT EXISTS "direction" "MoneyDirection",
ADD COLUMN IF NOT EXISTS "targetAccountId" TEXT;

-- AlterTable
ALTER TABLE "MoneyCommitment" ADD COLUMN IF NOT EXISTS "matchPattern" TEXT,
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MoneyPreference" (
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyPreference_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_counterAccountId_fkey" FOREIGN KEY ("counterAccountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRule" ADD CONSTRAINT "MoneyRule_targetAccountId_fkey" FOREIGN KEY ("targetAccountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyPreference" ADD CONSTRAINT "MoneyPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

