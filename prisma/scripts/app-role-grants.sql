-- Least-privilege role for the running app: read and write data, but no schema changes (no DROP/ALTER).
-- 1. In Neon → Kanakkupulla → Branches → main → Roles, create the role `kanakku_app` (Neon makes its password).
-- 2. Run this once as the owner (your local .env DATABASE_URL stays the owner, for migrations):
--      npx prisma db execute --file prisma/scripts/app-role-grants.sql
-- 3. In Vercel, point DATABASE_URL at kanakku_app (same host, pooled) and redeploy.
-- Tables and sequences that later migrations create are covered by the default privileges below.
GRANT CONNECT ON DATABASE neondb TO kanakku_app;
GRANT USAGE ON SCHEMA public TO kanakku_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kanakku_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO kanakku_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kanakku_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO kanakku_app;
-- The app never reads Prisma's migration history
REVOKE ALL ON "_prisma_migrations" FROM kanakku_app;
