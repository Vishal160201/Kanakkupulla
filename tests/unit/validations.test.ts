import { describe, expect, it } from "vitest";
import { asJsonRecord, numeric, parseDateInput, pickCustomFields } from "@/lib/validations/common";
import { transactionCreateSchema } from "@/lib/validations/transactions";
import { issuesToErrors } from "@/lib/validations/http";

describe("numeric", () => {
  it("accepts numbers and formatted strings", () => {
    expect(numeric().parse(1500)).toBe(1500);
    expect(numeric().parse("1,500.50")).toBe(1500.5);
  });

  it("rejects non-numbers", () => {
    expect(numeric().safeParse("abc").success).toBe(false);
    expect(numeric().safeParse(null).success).toBe(false);
  });
});

describe("parseDateInput", () => {
  it("parses DD/MM/YYYY as a local date", () => {
    const d = parseDateInput("05/03/2026")!;
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 5]);
  });

  it("rejects impossible calendar dates", () => {
    expect(parseDateInput("31/02/2026")).toBeNull();
    expect(parseDateInput("not a date")).toBeNull();
    expect(parseDateInput("")).toBeNull();
  });

  it("parses ISO strings", () => {
    expect(parseDateInput("2026-10-20T10:00:00.000Z")?.toISOString()).toBe("2026-10-20T10:00:00.000Z");
  });
});

describe("custom fields", () => {
  it("never lets reserved columns through", () => {
    const fields = pickCustomFields({
      fld_tx_note: "hi",
      id: "x",
      userId: "attacker",
      deletedAt: null,
      shopId: "s",
      $ACTION_ID_1: "a",
    });
    expect(fields).toEqual({ fld_tx_note: "hi" });
  });

  it("reads stored JSON columns defensively", () => {
    expect(asJsonRecord('{"a":1}')).toEqual({ a: 1 });
    expect(asJsonRecord("not json")).toEqual({});
    expect(asJsonRecord([1, 2])).toEqual({});
    expect(asJsonRecord(null)).toEqual({});
  });
});

describe("transactionCreateSchema", () => {
  const valid = { amount: "250", type: "EXPENSE", date: "2026-10-20", category: "FOOD", paymentMode: "Cash" };

  it("accepts what the transaction form sends", () => {
    const parsed = transactionCreateSchema.parse({ ...valid, fld_tx_receipt: "https://drive/x" });
    expect(parsed.amount).toBe(250);
    expect(parsed.date).toBeInstanceOf(Date);
    expect(parsed.fld_tx_receipt).toBe("https://drive/x");
  });

  it("reports field errors in the 422 shape the UI reads", () => {
    const result = transactionCreateSchema.safeParse({ ...valid, amount: "-5", type: "GIFT" });
    expect(result.success).toBe(false);
    const errors = issuesToErrors(result.error!);
    expect(errors.amount).toBe("Amount must be a positive number.");
    expect(errors.type).toBe("Type must be INCOME or EXPENSE.");
  });
});
