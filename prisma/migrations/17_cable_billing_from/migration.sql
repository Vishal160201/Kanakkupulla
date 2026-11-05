-- Cable TV: the first month houses are charged for (monthly billing starts the month after it's turned on)
ALTER TABLE "Shop" ADD COLUMN "cableBillingFrom" TEXT;

-- TCCL's bills to the shop this month (paid to TCCL on the 15th)
ALTER TABLE "Shop" ADD COLUMN "tcclBillMonth" TEXT,
ADD COLUMN "tcclBillAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
