-- Roles revamp: Owner (full access) + per-shop Admin / Staff roles with NONE/VIEW/MANAGE grids.
-- Carries today's settings over so nobody gains or loses access:
--   ADMIN users -> OWNER; STAFF/PHOTOGRAPHER users -> MEMBER with the Staff role in every studio shop;
--   the Staff role's grid and every role's alert switches come from the old RolePermission rows.

-- 1. Role table
CREATE TABLE "AccessRole" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "notifications" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccessRole_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccessRole_key_key" ON "AccessRole"("key");

-- Old flags for a role, falling back to the old built-in defaults when a row is missing
CREATE FUNCTION pg_temp.old_flag(r TEXT, p TEXT, fallback BOOLEAN) RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT "enabled" FROM "RolePermission" WHERE "role"::text = r AND "permission" = p), fallback)
$$ LANGUAGE sql STABLE;

CREATE FUNCTION pg_temp.old_alerts(r TEXT) RETURNS JSONB AS $$
  SELECT COALESCE(jsonb_object_agg(substring("permission" FROM 8), "enabled"), '{}'::jsonb)
  FROM "RolePermission" WHERE "role"::text = r AND "permission" LIKE 'notify\_%'
$$ LANGUAGE sql STABLE;

INSERT INTO "AccessRole" ("id", "key", "name", "description", "permissions", "notifications", "updatedAt") VALUES
(
  'role_admin', 'ADMIN', 'Admin', 'Runs a shop: can manage everything in the shops they are assigned to.',
  '{"dashboard":"VIEW","bookings":"MANAGE","albums":"MANAGE","gifts":"MANAGE","analytics":"MANAGE","ledger":"MANAGE","inventory":"MANAGE","recycle_bin":"MANAGE"}'::jsonb,
  pg_temp.old_alerts('ADMIN'),
  NOW()
),
(
  'role_staff', 'STAFF', 'Staff', 'Day-to-day work in the shops they are assigned to.',
  jsonb_build_object(
    'dashboard', 'VIEW',
    'bookings', CASE WHEN pg_temp.old_flag('STAFF', 'manage_bookings', true) THEN 'MANAGE' ELSE 'VIEW' END,
    'albums', CASE WHEN pg_temp.old_flag('STAFF', 'manage_galleries', false) THEN 'MANAGE'
                   WHEN pg_temp.old_flag('STAFF', 'view_galleries', true) THEN 'VIEW' ELSE 'NONE' END,
    'gifts', CASE WHEN pg_temp.old_flag('STAFF', 'manage_bookings', true) THEN 'MANAGE' ELSE 'VIEW' END,
    'analytics', CASE WHEN pg_temp.old_flag('STAFF', 'view_export_analytics', false) THEN 'MANAGE'
                      WHEN pg_temp.old_flag('STAFF', 'view_analytics', true) THEN 'VIEW' ELSE 'NONE' END,
    'ledger', CASE WHEN pg_temp.old_flag('STAFF', 'manage_transactions', false) THEN 'MANAGE'
                   WHEN pg_temp.old_flag('STAFF', 'view_transactions', true) THEN 'VIEW' ELSE 'NONE' END,
    'inventory', 'MANAGE',
    'recycle_bin', 'VIEW'
  ),
  pg_temp.old_alerts('STAFF'),
  NOW()
);

-- Owners' alert switches (previously the ADMIN role's)
INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt")
VALUES ('setting_owner_notifications', 'owner_notifications', pg_temp.old_alerts('ADMIN'), NOW(), NOW())
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = NOW();

-- 2. Shop assignments carry a role; existing (fertilizer shop) members become Staff
ALTER TABLE "ShopMember" ADD COLUMN "roleId" TEXT;
UPDATE "ShopMember" SET "roleId" = 'role_staff' WHERE "roleId" IS NULL;
ALTER TABLE "ShopMember" ALTER COLUMN "roleId" SET NOT NULL;
CREATE INDEX "ShopMember_roleId_idx" ON "ShopMember"("roleId");
ALTER TABLE "ShopMember" ADD CONSTRAINT "ShopMember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AccessRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. The old matrix is fully carried over; drop it (it also holds the only other use of the Role enum)
DROP TABLE "RolePermission";

-- 4. Role enum: ADMIN -> OWNER, STAFF / PHOTOGRAPHER -> MEMBER
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'MEMBER');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new"
  USING (CASE WHEN "role"::text = 'ADMIN' THEN 'OWNER' ELSE 'MEMBER' END)::"Role_new";
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

-- 5. Former staff keep their access: Staff in every studio shop
INSERT INTO "ShopMember" ("id", "shopId", "userId", "roleId", "createdAt")
SELECT 'sm_' || md5(u."id" || ':' || s."id"), s."id", u."id", 'role_staff', NOW()
FROM "User" u CROSS JOIN "Shop" s
WHERE u."role" = 'MEMBER' AND s."type" = 'STUDIO'
ON CONFLICT ("shopId", "userId") DO NOTHING;
