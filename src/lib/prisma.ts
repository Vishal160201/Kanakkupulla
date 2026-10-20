import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || '';

function createBaseClient() {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Money columns are stored as numeric(12,2) for exact storage, but the app (and every JSON
// response) works with plain numbers, so they are converted on read. Aggregates (_sum etc.)
// are not covered by result extensions: wrap those with toNumber().
const money = <Field extends string>(field: Field) => ({
  needs: { [field]: true } as Record<Field, true>,
  compute: (row: Record<Field, Prisma.Decimal>) => Number(row[field]),
});

/** Like money(), for nullable columns (null stays null). */
const optionalNumber = <Field extends string>(field: Field) => ({
  needs: { [field]: true } as Record<Field, true>,
  compute: (row: Record<Field, Prisma.Decimal | null>) => (row[field] == null ? null : Number(row[field])),
});

function extend(client: PrismaClient) {
  return client.$extends({
    result: {
      order: { package: money('package'), advance: money('advance'), due: money('due') },
      transaction: { amount: money('amount') },
      product: { price: money('price') },
      productOrder: { discountAmount: money('discountAmount') },
      invoice: { discount: money('discount') },
      invoiceLineItem: { rate: money('rate'), amount: money('amount') },
      inventoryProduct: { price: money('price'), packSize: optionalNumber('packSize') },
      inventoryBill: { totalAmount: money('totalAmount'), paidAmount: money('paidAmount') },
      stockMovement: { quantity: money('quantity'), unitPrice: money('unitPrice'), amount: money('amount') },
      customerPayment: { amount: money('amount') },
      produceCollection: { quantity: money('quantity'), rate: money('rate'), amount: money('amount') },
      producePayment: { amount: money('amount'), cashAmount: money('cashAmount'), creditDeducted: money('creditDeducted') },
      produceSale: { quantity: money('quantity'), rate: money('rate'), totalAmount: money('totalAmount'), paidAmount: money('paidAmount') },
      produceReceipt: { amount: money('amount') },
    },
  });
}

export type AppPrismaClient = ReturnType<typeof extend>;

const globalForPrisma = global as unknown as { basePrisma?: PrismaClient; prisma?: AppPrismaClient };

/** Unextended client, for libraries that need a plain PrismaClient (e.g. the NextAuth adapter). */
export const basePrisma = globalForPrisma.basePrisma ?? createBaseClient();
const prisma = globalForPrisma.prisma ?? extend(basePrisma);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prisma = prisma;
}

/** Converts a Decimal (or null from an empty aggregate) to a number. */
export function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  return value == null ? 0 : Number(value);
}

export default prisma;

type Row<M extends keyof AppPrismaClient> = AppPrismaClient[M] extends { findFirstOrThrow: (...args: never[]) => infer R }
  ? Awaited<R>
  : never;

/** Model rows as the app sees them (money fields already converted to numbers). */
export type TransactionRow = Row<"transaction">;
export type InvoiceRow = Row<"invoice">;
export type InvoiceLineItemRow = Row<"invoiceLineItem">;
