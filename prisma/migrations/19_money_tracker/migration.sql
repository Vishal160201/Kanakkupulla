-- Personal money tracker (/money): new tables only, no changes to existing data.
-- CreateEnum
CREATE TYPE "MoneyAccountType" AS ENUM ('BANK', 'CREDIT_CARD');

-- CreateEnum
CREATE TYPE "MoneyImportSource" AS ENUM ('PDF', 'CSV', 'MANUAL', 'XLSX', 'AA_JSON', 'OCR');

-- CreateEnum
CREATE TYPE "MoneyImportStatus" AS ENUM ('OK', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "MoneyDirection" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "MoneyTxnKind" AS ENUM ('EXPENSE', 'INCOME', 'SALARY', 'INTEREST', 'SELF_TRANSFER', 'CARD_PAYMENT', 'CARD_REFUND', 'PASS_THROUGH', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "MoneyRuleField" AS ENUM ('NARRATION', 'COUNTERPARTY', 'UPI_ID', 'MERCHANT');

-- CreateEnum
CREATE TYPE "MoneyCommitmentType" AS ENUM ('SAVINGS_GOAL', 'CARD_BILL', 'CARD_EMI', 'RECEIVABLE', 'PAYABLE', 'EXPECTED_INCOME');

-- CreateEnum
CREATE TYPE "MoneyCommitmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED');

-- CreateTable
CREATE TABLE "MoneyAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "type" "MoneyAccountType" NOT NULL,
    "last4" TEXT,
    "ownIdentifiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPool" BOOLEAN NOT NULL DEFAULT false,
    "lowBalanceAlert" DECIMAL(14,2) NOT NULL DEFAULT 1000,
    "cycleStartDay" INTEGER,
    "dueDay" INTEGER,
    "creditLimit" DECIMAL(14,2),
    "color" TEXT NOT NULL DEFAULT '#f97316',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyImport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sourceType" "MoneyImportSource" NOT NULL,
    "filename" TEXT,
    "fileHash" TEXT,
    "periodFrom" DATE,
    "periodTo" DATE,
    "openingBalance" DECIMAL(14,2),
    "closingBalance" DECIMAL(14,2),
    "status" "MoneyImportStatus" NOT NULL DEFAULT 'OK',
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "importId" TEXT,
    "txnDate" DATE NOT NULL,
    "txnTime" TEXT,
    "valueDate" DATE,
    "narration" TEXT NOT NULL,
    "refNo" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(14,2) NOT NULL,
    "direction" "MoneyDirection" NOT NULL,
    "balanceAfter" DECIMAL(14,2),
    "counterparty" TEXT,
    "upiId" TEXT,
    "categoryId" TEXT,
    "kind" "MoneyTxnKind" NOT NULL DEFAULT 'EXPENSE',
    "linkedTxnId" TEXT,
    "commitmentId" TEXT,
    "note" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#64748b',
    "icon" TEXT NOT NULL DEFAULT 'ph-tag',
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "field" "MoneyRuleField" NOT NULL DEFAULT 'NARRATION',
    "pattern" TEXT NOT NULL,
    "isRegex" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "kind" "MoneyTxnKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCommitment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MoneyCommitmentType" NOT NULL,
    "accountId" TEXT,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "status" "MoneyCommitmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "linkedCommitmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCommitmentSchedule" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paidOn" DATE,
    "transactionId" TEXT,

    CONSTRAINT "MoneyCommitmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoneyAccount_userId_sortOrder_idx" ON "MoneyAccount"("userId", "sortOrder");

-- CreateIndex
CREATE INDEX "MoneyImport_userId_importedAt_idx" ON "MoneyImport"("userId", "importedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyImport_accountId_fileHash_key" ON "MoneyImport"("accountId", "fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyTransaction_linkedTxnId_key" ON "MoneyTransaction"("linkedTxnId");

-- CreateIndex
CREATE INDEX "MoneyTransaction_userId_txnDate_idx" ON "MoneyTransaction"("userId", "txnDate");

-- CreateIndex
CREATE INDEX "MoneyTransaction_accountId_txnDate_idx" ON "MoneyTransaction"("accountId", "txnDate");

-- CreateIndex
CREATE INDEX "MoneyTransaction_userId_kind_idx" ON "MoneyTransaction"("userId", "kind");

-- CreateIndex
CREATE INDEX "MoneyTransaction_categoryId_idx" ON "MoneyTransaction"("categoryId");

-- CreateIndex
CREATE INDEX "MoneyTransaction_importId_idx" ON "MoneyTransaction"("importId");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyTransaction_accountId_dedupeKey_key" ON "MoneyTransaction"("accountId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyCategory_userId_name_key" ON "MoneyCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "MoneyRule_userId_priority_idx" ON "MoneyRule"("userId", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "MoneyCommitment_linkedCommitmentId_key" ON "MoneyCommitment"("linkedCommitmentId");

-- CreateIndex
CREATE INDEX "MoneyCommitment_userId_status_idx" ON "MoneyCommitment"("userId", "status");

-- CreateIndex
CREATE INDEX "MoneyCommitmentSchedule_commitmentId_dueDate_idx" ON "MoneyCommitmentSchedule"("commitmentId", "dueDate");

-- CreateIndex
CREATE INDEX "MoneyCommitmentSchedule_transactionId_idx" ON "MoneyCommitmentSchedule"("transactionId");

-- AddForeignKey
ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyImport" ADD CONSTRAINT "MoneyImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyImport" ADD CONSTRAINT "MoneyImport_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_importId_fkey" FOREIGN KEY ("importId") REFERENCES "MoneyImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MoneyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_linkedTxnId_fkey" FOREIGN KEY ("linkedTxnId") REFERENCES "MoneyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyTransaction" ADD CONSTRAINT "MoneyTransaction_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "MoneyCommitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCategory" ADD CONSTRAINT "MoneyCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCategory" ADD CONSTRAINT "MoneyCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MoneyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRule" ADD CONSTRAINT "MoneyRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyRule" ADD CONSTRAINT "MoneyRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MoneyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitment" ADD CONSTRAINT "MoneyCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitment" ADD CONSTRAINT "MoneyCommitment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitment" ADD CONSTRAINT "MoneyCommitment_linkedCommitmentId_fkey" FOREIGN KEY ("linkedCommitmentId") REFERENCES "MoneyCommitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitmentSchedule" ADD CONSTRAINT "MoneyCommitmentSchedule_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "MoneyCommitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyCommitmentSchedule" ADD CONSTRAINT "MoneyCommitmentSchedule_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "MoneyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

