-- Multi-shop: every ledger entry belongs to a shop.
-- The default shop lives in SystemSetting "default_shop_id" (a single row), replacing Shop.isDefault.
-- Also removes the category budget feature.

-- 1. Budgets are being removed. Refuse to drop data that exists (there were 0 rows when this was written).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "CategoryBudget") THEN
    RAISE EXCEPTION 'CategoryBudget has rows; export or delete them before applying 3_multi_shop';
  END IF;
END $$;

ALTER TABLE "CategoryBudget" DROP CONSTRAINT "CategoryBudget_userId_fkey";
DROP TABLE "CategoryBudget";

-- 2. Shop: default flag moves to SystemSetting; names are unique.
DROP INDEX "Shop_isDefault_idx";
ALTER TABLE "Shop" DROP COLUMN "isDefault";
CREATE UNIQUE INDEX "Shop_name_key" ON "Shop"("name");

-- 3. Default shop + setting pointing at it.
INSERT INTO "Shop" ("id", "name", "color", "isArchived", "createdAt", "updatedAt")
VALUES ('shop_main', 'Main Shop', '#6366f1', false, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt")
VALUES ('setting_default_shop_id', 'default_shop_id', '"shop_main"'::jsonb, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- 4. Backfill every existing transaction (live and trashed) to the default shop, then require a shop.
UPDATE "Transaction" SET "shopId" = 'shop_main' WHERE "shopId" IS NULL;
ALTER TABLE "Transaction" ALTER COLUMN "shopId" SET NOT NULL;
