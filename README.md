# Kanakkupulla

Kanakkupulla is a management app for a photography studio. It covers:

- **Bookings**: shoots, clients, calendar, upcoming shoots and overdue alerts
- **Album tracking**: progress of albums and deliverables for each booking
- **Transactions ledger**: income and expenses, budgets, PDF exports
- **Gifts & frames orders**: product orders with invoices
- **Analytics**: dashboards for revenue, bookings and orders
- **Roles & permissions**: Admin, Staff and Photographer roles with per-module permissions
- **Integrations**: Google Drive, plus notifications by web push, email (SMTP) and WhatsApp

## Stack

- Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript
- Prisma 7 with PostgreSQL (Neon / `pg` driver adapters)
- next-auth 4 (credentials + Google/Apple OAuth)
- Tailwind CSS, shadcn/base-ui components, Recharts
- `whatsapp-bot-server/`: a separate Express + Baileys service that sends WhatsApp messages

## Setup

```bash
npm ci                 # also runs `prisma generate` (postinstall)
cp .env.example .env   # fill in the values
npm run db:migrate     # apply migrations
npm run dev            # http://localhost:3000
```

### Environment variables

See `.env.example` for the full list. Required at minimum: `DATABASE_URL` and `NEXTAUTH_SECRET`. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the public URL of the app.

| Area | Variables |
| --- | --- |
| Database | `DATABASE_URL` |
| Auth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_ID`, `APPLE_SECRET` |
| Google Drive | `NEXT_PUBLIC_GOOGLE_API_KEY`, `NEXT_PUBLIC_GOOGLE_APP_ID` (plus the Google OAuth client above) |
| Web push | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| Cron | `CRON_SECRET` |
| Personal tracker (optional) | `PERSONAL_TRACKER_EMAIL`, `NEXT_PUBLIC_PERSONAL_TRACKER_EMAIL` (same value) |
| WhatsApp | `WHATSAPP_BOT_URL`, `WHATSAPP_BOT_SECRET` |
| Bot server only | `WHATSAPP_BOT_SECRET`, `ALLOWED_ORIGIN` (optional), `PORT` (optional, default 3001) |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate && next build`. It never touches the database. |
| `npm start` | Start the production server |
| `npm test` | Run the unit tests (Vitest) |
| `npm run lint` | `eslint .` |
| `npm run db:migrate` | `prisma migrate deploy`: apply pending migrations (production/CI) |
| `npm run db:migrate:dev` | `prisma migrate dev`: create and apply a new migration in development |
| `npm run db:push` | `prisma db push`: prototype schema changes without a migration (dev only) |
| `npm run db:seed` | `tsx prisma/seed.ts`: seed sample bookings |

## Database workflow

Schema changes are managed with Prisma Migrate. Migrations live in `prisma/migrations/`:

- `0_init` is the baseline. It matches the schema the existing (`db push`-managed) production database already has.
- `1_invoices_and_shops` adds `Shop`, `Invoice`, `InvoiceLineItem`, the optional `Transaction.shopId` and new `Transaction` indexes.

Steps:

- **New database:** run `npm run db:migrate`. This applies every migration.
- **Existing database** (created earlier with `prisma db push`): mark the baseline as applied once, then deploy as usual:

  ```bash
  npx prisma migrate resolve --applied 0_init
  npx prisma migrate deploy   # applies 1_invoices_and_shops, 2_money_decimal_and_indexes, ...
  ```

  Before resolving, you can check that the live database matches the baseline. Run `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script`; the output should contain only the statements from `1_invoices_and_shops` and later migrations.
- **Changing the schema:** edit `prisma/schema.prisma`, run `npm run db:migrate:dev -- --name <change>` against a development database, then commit the generated migration.

Do not use `db push --accept-data-loss` against shared or production databases.

## Cron endpoints

`/api/cron/*` (e.g. `daily-reminders`, `reminders`, `purge-recycle-bin`) require the header:

```
Authorization: Bearer $CRON_SECRET
```

Set up your scheduler (Vercel Cron, GitHub Actions, cron-job.org, etc.) to send this header.

## WhatsApp bot

`whatsapp-bot-server/` runs separately (`cd whatsapp-bot-server && npm ci && npm start`, or use its Dockerfile). On first start, scan the QR code from **Settings → Integrations → WhatsApp**.

- Every `/api/*` route on the bot needs the header `x-bot-secret: $WHATSAPP_BOT_SECRET`. If the secret is not set, the bot rejects all requests.
- Set `WHATSAPP_BOT_SECRET` to the **same value** in the Next.js app and in the bot server. Set `WHATSAPP_BOT_URL` in the Next.js app to the bot's URL.
- CORS is off by default, because the app calls the bot server-to-server. Set `ALLOWED_ORIGIN` only if a browser must call the bot directly.
- Session data is stored in `.baileys_auth/`. It is git-ignored; keep it on a persistent volume.

## Deployment

The root `Dockerfile` builds the standalone Next.js server:

```bash
docker build -t kanakkupulla .
docker run -p 3000:3000 --env-file .env kanakkupulla
```

The build does not run migrations. Apply them as a separate release step with `npm run db:migrate`, from CI or from a one-off container that has the full `node_modules`, with `DATABASE_URL` set. Then start the new image.

On Railway, set the service's **Pre-deploy command** to `npx prisma migrate deploy` so migrations run before each new deployment starts.

`2_money_decimal_and_indexes` converts money columns from `double precision` to `numeric(12,2)` (values are rounded to 2 decimal places) and turns `Notification.priority` into an enum. Take a database backup (Neon branch) before applying it.
