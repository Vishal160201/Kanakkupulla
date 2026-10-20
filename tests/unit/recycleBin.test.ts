import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => {
  const op = (name: string) => vi.fn((args: unknown) => ({ op: name, args }));
  return {
    booking: { findUnique: vi.fn(), update: op("booking.update"), deleteMany: op("booking.deleteMany") },
    transaction: {
      findMany: vi.fn(),
      updateMany: op("transaction.updateMany"),
      update: op("transaction.update"),
      deleteMany: op("transaction.deleteMany"),
    },
    order: { deleteMany: op("order.deleteMany") },
    invoice: { deleteMany: op("invoice.deleteMany") },
    productOrder: { deleteMany: op("productOrder.deleteMany") },
    recycleBin: { create: op("recycleBin.create"), delete: op("recycleBin.delete"), deleteMany: op("recycleBin.deleteMany") },
    systemLog: { create: op("systemLog.create") },
    $transaction: vi.fn(async (ops: unknown) => ops),
  };
});

vi.mock("@/lib/prisma", () => ({ default: db }));
vi.mock("@/lib/googleDriveAuth", () => ({ getGoogleDriveToken: vi.fn() }));
vi.mock("@/lib/authz", () => ({
  roleHasPermission: vi.fn(async (role: string, permission: string) =>
    role === "ADMIN" || (role === "STAFF" && permission === "manage_bookings")),
}));

import { canAccessEntry, canRestoreEntry, purgeEntry, restoreEntry, trashBooking } from "@/lib/recycleBin";

type Op = { op: string; args: { where?: unknown; data?: { originalData?: { trashedTransactionIds?: string[] } } } };
const lastBatch = () => db.$transaction.mock.calls.at(-1)![0] as Op[];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("trashBooking", () => {
  it("soft-deletes the booking and its live transactions together", async () => {
    db.booking.findUnique.mockResolvedValue({ id: "b1", deletedAt: null });
    db.transaction.findMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);

    expect(await trashBooking("b1", "u1")).toBe(true);

    const ops = lastBatch();
    expect(ops.map(o => o.op)).toEqual(["booking.update", "transaction.updateMany", "recycleBin.create", "systemLog.create"]);
    expect(ops[1].args.where).toEqual({ id: { in: ["t1", "t2"] } });
    expect(ops[2].args.data?.originalData?.trashedTransactionIds).toEqual(["t1", "t2"]);
    // Transactions must never be hard-deleted when a booking is trashed
    expect(db.transaction.deleteMany).not.toHaveBeenCalled();
  });

  it("ignores missing or already-trashed bookings", async () => {
    db.booking.findUnique.mockResolvedValue({ id: "b1", deletedAt: new Date() });
    expect(await trashBooking("b1", "u1")).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("restoreEntry", () => {
  it("restores exactly the transactions trashed with a booking", async () => {
    await restoreEntry({
      id: "r1", itemType: "booking", itemId: "b1", trashedById: "u1", trashedAt: new Date(),
      originalData: { trashedTransactionIds: ["t1"] },
    });
    const ops = lastBatch();
    expect(ops.map(o => o.op)).toEqual(["booking.update", "transaction.updateMany", "recycleBin.delete"]);
    expect(ops[1].args).toEqual({ where: { id: { in: ["t1"] } }, data: { deletedAt: null } });
  });
});

describe("purgeEntry", () => {
  it("removes a booking's dependants before the booking", async () => {
    await purgeEntry({ id: "r1", itemType: "booking", itemId: "b1", trashedById: "u1", trashedAt: new Date(), originalData: {} });
    expect(lastBatch().map(o => o.op)).toEqual([
      "transaction.deleteMany", "order.deleteMany", "invoice.deleteMany", "booking.deleteMany", "recycleBin.deleteMany",
    ]);
  });

  it("only hard-deletes a single transaction that is still trashed", async () => {
    await purgeEntry({ id: "r1", itemType: "transaction", itemId: "t1", trashedById: "u1", trashedAt: new Date(), originalData: {} });
    expect(lastBatch()[0].args.where).toEqual({ id: "t1", deletedAt: { not: null } });
  });
});

describe("access rules", () => {
  it("keeps personal expenses private to their owner", () => {
    expect(canAccessEntry({ itemType: "PERSONAL_EXPENSE", trashedById: "u1" }, "u1")).toBe(true);
    expect(canAccessEntry({ itemType: "PERSONAL_EXPENSE", trashedById: "u1" }, "u2")).toBe(false);
    expect(canAccessEntry({ itemType: "booking", trashedById: "u1" }, "u2")).toBe(true);
  });

  it("requires the matching permission to restore", async () => {
    const staff = { id: "u2", role: "STAFF" as const, email: null, name: null };
    expect(await canRestoreEntry({ itemType: "booking", trashedById: "u1" }, staff)).toBe(true);
    expect(await canRestoreEntry({ itemType: "transaction", trashedById: "u1" }, staff)).toBe(false);
  });
});
