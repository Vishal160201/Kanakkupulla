-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "smsApiKey" TEXT,
ADD COLUMN     "smsAutoReminders" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smsFrom" TEXT,
ADD COLUMN     "smsLanguage" TEXT NOT NULL DEFAULT 'en';

