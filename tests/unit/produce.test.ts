import { describe, expect, it } from "vitest";
import {
  buyerDue,
  checkFarmerPayment,
  checkProduceSale,
  farmerDue,
  formatQuantity,
  maxCreditDeduction,
  produceAmount,
  produceStock,
  toKg,
  wouldGoNegative,
} from "@/lib/produceMath";
import { packLabel, quantityUnit, validatePack } from "@/lib/inventoryPacks";

describe("produce amounts and balances", () => {
  it("prices a collection at quantity × rate, rounded to paise", () => {
    expect(produceAmount(123.456, 72.5)).toBe(8950.56);
    expect(produceAmount(0.1, 0.2)).toBe(0.02);
  });

  it("owes the farmer what was collected (all crops) minus what was paid", () => {
    expect(farmerDue(10000 + 4500, 2500.5)).toBe(11999.5);
    expect(farmerDue(0.1 + 0.2, 0.3)).toBe(0);
  });

  it("keeps stock per item to a thousandth of its unit", () => {
    expect(produceStock(1000.1234, 400.0004)).toBe(600.123);
  });

  it("totals stock across units in kg", () => {
    expect(toKg(2.5, "quintal")).toBe(250);
    expect(toKg(1.2, "tonne")).toBe(1200);
    expect(toKg(80, "kg")).toBe(80);
  });

  it("formats quantities with their unit", () => {
    expect(formatQuantity(1234.5, "kg")).toBe("1,234.5 kg");
    expect(formatQuantity(2, "quintal")).toBe("2 quintal");
  });

  it("counts a buyer's due as unpaid sales minus receipts", () => {
    expect(buyerDue(50000, 20000, 10000)).toBe(20000);
    expect(buyerDue(50000, 50000, 0)).toBe(0);
  });

  it("caps the credit deduction at the smaller balance", () => {
    expect(maxCreditDeduction(8000, 3000)).toBe(3000);
    expect(maxCreditDeduction(2000, 3000)).toBe(2000);
    expect(maxCreditDeduction(2000, -50)).toBe(0);
  });

  it("flags only real drops below zero, not rounding noise", () => {
    expect(wouldGoNegative(100, 100.004)).toBe(false);
    expect(wouldGoNegative(100, 100.01)).toBe(true);
    expect(wouldGoNegative(5, 5.0004, "quantity")).toBe(false);
    expect(wouldGoNegative(5, 5.001, "quantity")).toBe(true);
  });
});

describe("checkFarmerPayment", () => {
  const base = { produceDue: 8000, fertilizerCredit: 3000 };

  it("splits a payment into cash and deducted credit", () => {
    expect(checkFarmerPayment({ ...base, cashAmount: 5000, creditDeducted: 3000 })).toEqual({
      ok: true,
      cash: 5000,
      deducted: 3000,
      total: 8000,
      dueAfter: 0,
      creditAfter: 0,
    });
  });

  it("allows a partial cash-only payment", () => {
    const res = checkFarmerPayment({ ...base, cashAmount: 1000, creditDeducted: 0 });
    expect(res.ok && res.dueAfter).toBe(7000);
    expect(res.ok && res.creditAfter).toBe(3000);
  });

  it("allows settling with credit only", () => {
    expect(checkFarmerPayment({ ...base, cashAmount: 0, creditDeducted: 2500 })).toMatchObject({ ok: true, cash: 0, deducted: 2500, dueAfter: 5500 });
  });

  it("refuses more than the produce due", () => {
    const res = checkFarmerPayment({ ...base, cashAmount: 6000, creditDeducted: 3000 });
    expect(!res.ok && res.errors.cashAmount).toMatch(/8000/);
  });

  it("refuses deducting more credit than is owed", () => {
    const res = checkFarmerPayment({ ...base, cashAmount: 0, creditDeducted: 3500 });
    expect(!res.ok && res.errors.creditDeducted).toMatch(/3000/);
  });

  it("refuses an empty payment", () => {
    expect(checkFarmerPayment({ ...base, cashAmount: 0, creditDeducted: 0 }).ok).toBe(false);
  });
});

describe("checkProduceSale", () => {
  const maize = { name: "Maize", unit: "quintal" };

  it("defaults paid to the total", () => {
    expect(checkProduceSale({ quantity: 10, rate: 2200, stock: 25, item: maize })).toEqual({ ok: true, total: 22000, paid: 22000, due: 0 });
  });

  it("leaves the unpaid part as the buyer's due", () => {
    expect(checkProduceSale({ quantity: 10, rate: 2200, paidAmount: 20000, stock: 10, item: maize })).toEqual({ ok: true, total: 22000, paid: 20000, due: 2000 });
  });

  it("can't sell more of an item than its stock", () => {
    const res = checkProduceSale({ quantity: 10.5, rate: 2200, stock: 10, item: maize });
    expect(!res.ok && res.errors.quantity).toBe("Only 10 quintal of Maize in stock.");
    const empty = checkProduceSale({ quantity: 1, rate: 2200, stock: 0, item: maize });
    expect(!empty.ok && empty.errors.quantity).toBe("No Maize in stock.");
  });

  it("refuses paying more than the total", () => {
    expect(checkProduceSale({ quantity: 1, rate: 700, paidAmount: 701, stock: 10, item: maize }).ok).toBe(false);
  });
});

describe("product pack types", () => {
  it("labels packs by size and type", () => {
    expect(packLabel({ unit: "Bottle", packSize: 1, packUnit: "L" })).toBe("1 L bottle");
    expect(packLabel({ unit: "Bottle", packSize: 500, packUnit: "ml" })).toBe("500 ml bottle");
    expect(packLabel({ unit: "Packet", packSize: 250, packUnit: "g" })).toBe("250 g packet");
    expect(packLabel({ unit: "Bag", packSize: 50, packUnit: "kg" })).toBe("50 kg bag");
    expect(packLabel({ unit: "Bag", packSize: null, packUnit: "kg" })).toBe("Bag");
    expect(packLabel({ unit: "Loose", packSize: null, packUnit: "kg" })).toBe("per kg");
    expect(packLabel({ unit: "Piece" })).toBe("piece");
    expect(packLabel({ unit: "Sack" })).toBe("Sack");
  });

  it("counts stock in packs, or in the measure for loose products", () => {
    expect(quantityUnit({ unit: "Bag" }, 3)).toBe("bags");
    expect(quantityUnit({ unit: "Bottle" }, 1)).toBe("bottle");
    expect(quantityUnit({ unit: "Loose", packUnit: "L" }, 20)).toBe("L");
  });

  it("asks sized packs for a size and an allowed unit", () => {
    expect(validatePack({ unit: "Bottle", packSize: 1, packUnit: "L" })).toEqual({ ok: true, value: { unit: "Bottle", packSize: 1, packUnit: "L" } });
    expect(validatePack({ unit: "Bottle", packSize: null, packUnit: "L" })).toMatchObject({ ok: false, errors: { packSize: expect.any(String) } });
    expect(validatePack({ unit: "Packet", packSize: 1, packUnit: "L" })).toMatchObject({ ok: false, errors: { packUnit: expect.any(String) } });
    expect(validatePack({ unit: "Bag", packSize: 0, packUnit: "kg" }).ok).toBe(false);
  });

  it("drops the size for loose and piece products", () => {
    expect(validatePack({ unit: "Loose", packSize: 5, packUnit: "tonne" })).toEqual({ ok: true, value: { unit: "Loose", packSize: null, packUnit: "tonne" } });
    expect(validatePack({ unit: "Piece", packSize: 5, packUnit: "kg" })).toEqual({ ok: true, value: { unit: "Piece", packSize: null, packUnit: null } });
    expect(validatePack({ unit: "Kg" }).ok).toBe(false);
  });
});
