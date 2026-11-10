import { Prisma } from "@prisma/client";

/** Exact decimal maths for the tracker (decimal.js via Prisma). Server-side only. */
export type Dec = Prisma.Decimal;
export const Decimal = Prisma.Decimal;

export const dec = (value: string | number | Prisma.Decimal | null | undefined): Prisma.Decimal =>
  new Prisma.Decimal(value == null || value === "" ? 0 : value);

export const ZERO = new Prisma.Decimal(0);

/** "1234.50"-style string with exactly two decimals. */
export const money = (value: Prisma.Decimal | string | number): string => dec(value).toFixed(2);

export const sum = (values: (Prisma.Decimal | string | number)[]): Prisma.Decimal =>
  values.reduce<Prisma.Decimal>((total, v) => total.plus(dec(v)), ZERO);

export const maxDec = (a: Prisma.Decimal, b: Prisma.Decimal) => (a.greaterThan(b) ? a : b);
