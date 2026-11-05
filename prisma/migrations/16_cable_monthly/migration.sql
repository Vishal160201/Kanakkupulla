-- Cable TV: a fixed monthly amount per house (reduced for node houses), charged once a month
ALTER TABLE "Shop" ADD COLUMN "cableMonthlyFee" DECIMAL(12,2),
ADD COLUMN "cableNodeFee" DECIMAL(12,2),
ADD COLUMN "cableBilledMonth" TEXT;

ALTER TABLE "CableSubscriber" ADD COLUMN "nodeHouse" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "monthlyFee" DECIMAL(12,2);

ALTER TABLE "CableRenewal" ADD COLUMN "period" TEXT;

CREATE UNIQUE INDEX "CableRenewal_subscriberId_period_key" ON "CableRenewal"("subscriberId", "period");
