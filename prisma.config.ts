// Prisma 7 config. DATABASE_URL is read from the environment (or .env via dotenv).
// It is intentionally NOT required here: `prisma generate` and offline
// `prisma migrate diff` must work at build time without database credentials.
// Commands that talk to the database (migrate deploy/dev, db push, studio)
// will fail with a clear Prisma error if DATABASE_URL is unset.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
