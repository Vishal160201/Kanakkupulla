-- One-off (2026-11-06): the single-digit migration folders were renamed 0_… → 00_… so they sort before 10_…
-- (Prisma orders migrations by folder name; `migrate deploy` on an empty database failed at 10_tccl_cable).
-- Run once against every database that applied them under the old names, before the next `migrate deploy`:
--   npx prisma db execute --file prisma/scripts/rename-migrations-zero-padded.sql
-- The migration files are unchanged, so their checksums still match. Safe to run twice.
UPDATE "_prisma_migrations" SET migration_name = '0' || migration_name
WHERE migration_name IN (
  '0_init', '1_invoices_and_shops', '2_money_decimal_and_indexes', '3_multi_shop', '4_shop_icons_to_phosphor',
  '5_shop_types_and_inventory', '6_roles_per_shop', '7_produce_and_pack_sizes', '8_cable_subscribers', '9_usernames'
);
