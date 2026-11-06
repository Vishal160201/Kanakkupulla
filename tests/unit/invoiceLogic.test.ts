import { describe, expect, it } from "vitest";
import { buildInvoiceViewModel, buildOrderInvoiceViewModel, buildPaymentSteps, itemIcon } from "@/components/invoices/utils/invoiceLogic";
import { formatCurrency } from "@/components/invoices/utils/currency";
import { formatDate } from "@/components/invoices/utils/date";

const NOW = new Date("2026-11-06T06:00:00Z");
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

const item = (description: string, amount: number, quantity = 1) => ({ id: description, invoiceId: "i1", description, quantity, rate: amount / quantity, amount, createdAt: NOW, updatedAt: NOW });
const invoice = (lineItems: ReturnType<typeof item>[], discount = 0) => ({ id: "i1", invoiceNumber: "INV-0245", bookingId: "b1", discount, createdAt: day("2026-11-03"), updatedAt: NOW, deletedAt: null, lineItems });
const booking = (date: string, extra: Record<string, unknown> = {}) => ({
  id: "b1", clientId: "c1", category: "Wedding", date: day(date), time: "06:00 AM", location: "Tenkasi", status: "Confirmed",
  createdAt: NOW, updatedAt: NOW, contractUrl: null, galleryUrl: null, attachments: null, bookingNumber: "BK-1", createdById: null,
  customData: null, deletedAt: null, inclusions: null, notes: null, packageName: null, photographers: null, updatedById: null,
  galleryDelivered: false, albumStatus: "PENDING",
  client: { id: "c1", name: "Arun Kumar", phone: "9876543210", email: null, createdAt: NOW, updatedAt: NOW },
  ...extra,
});
const pay = (amount: number, date: string, status = "SETTLED") => ({ amount, date: day(date), status });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const build = (inv: any, b: any, payments: any[] = [], settings: Record<string, string> = {}) =>
  buildInvoiceViewModel(inv, b, payments, settings, { assetBase: "https://example.test", now: NOW });

describe("invoice money", () => {
  it("subtracts the discount and payments, and works out the status", () => {
    const vm = build(invoice([item("Wedding Package", 41000)], 1000), booking("2026-12-01"), [pay(10000, "2026-10-01")]);
    expect(vm.status).toBe("PARTIALLY_PAID");
    expect(vm.balanceDue).toBe("₹30,000");
    expect(vm.balanceDueAmount).toBe(30000);
    expect(vm.summaryRows.map((r) => `${r.label} ${r.value}`)).toEqual(["Subtotal ₹41,000", "Discount - ₹1,000", "Total ₹40,000", "Amount paid - ₹10,000"]);
    expect(vm.paymentProgress).toMatchObject({ percentage: 25, paid: "₹10,000", total: "₹40,000" });
  });

  it("ignores payments that aren't settled", () => {
    const vm = build(invoice([item("Package", 5000)]), booking("2026-12-01"), [pay(5000, "2026-10-01", "PENDING")]);
    expect(vm.status).toBe("PENDING");
    expect(vm.balanceDue).toBe("₹5,000");
  });

  it("is overdue only when nothing is paid and the event has passed", () => {
    expect(build(invoice([item("Package", 5000)]), booking("2026-10-01")).status).toBe("OVERDUE");
    expect(build(invoice([item("Package", 5000)]), booking("2026-10-01"), [pay(1000, "2026-09-01")]).status).toBe("PARTIALLY_PAID");
    const overdue = build(invoice([item("Package", 5000)]), booking("2026-10-01"));
    expect(overdue.amountCard).toMatchObject({ tone: "overdue", amount: "5,000" });
    expect(overdue.paymentProgress.steps).toEqual([{ label: "Full payment", state: "overdue", caption: "Overdue", amount: "₹5,000" }]);
  });

  it("never shows a negative balance: an overpayment is labelled instead", () => {
    const vm = build(invoice([item("Package", 85000)]), booking("2026-10-01"), [pay(90000, "2026-10-01")]);
    expect(vm.status).toBe("PAID");
    expect(vm.balanceDue).toBe("₹0");
    expect(vm.summaryRows).toContainEqual({ label: "Overpaid", value: "₹5,000", tone: "paid" });
    expect(vm.amountCard.note).toBe("Overpaid by ₹5,000");
    expect(vm.payment).toBeUndefined();
  });

  it("sums in paise, so float noise never leaves a ₹0.01 balance", () => {
    const vm = build(invoice([item("A", 0.1), item("B", 0.2)]), booking("2026-12-01"), [pay(0.3, "2026-10-01")]);
    expect(vm.status).toBe("PAID");
    expect(vm.balanceDue).toBe("₹0");
  });

  it("caps a discount larger than the subtotal", () => {
    const vm = build(invoice([item("Package", 1000)], 5000), booking("2026-12-01"));
    expect(vm.summaryRows).toContainEqual({ label: "Discount", value: "- ₹1,000", tone: "discount" });
    expect(vm.balanceDue).toBe("₹0");
  });

  it("shows paise only when there are some", () => {
    expect(formatCurrency(41000)).toBe("₹41,000");
    expect(formatCurrency(1250.5)).toBe("₹1,250.50");
    expect(formatCurrency(-200)).toBe("-₹200");
  });
});

describe("payment steps", () => {
  const p = (amount: number, d: string) => ({ amount, date: day(d) });
  it("never shows more than three steps; later payments are merged", () => {
    const steps = buildPaymentSteps([p(5000, "2026-09-01"), p(3000, "2026-09-10"), p(2000, "2026-09-20"), p(1000, "2026-10-01")], 4000, "Before event", false);
    expect(steps.map((s) => `${s.label}:${s.amount}`)).toEqual(["Advance:₹5,000", "Payments 2–4:₹6,000", "Balance:₹4,000"]);
  });
  it("ends with the final payment once everything is paid", () => {
    const steps = buildPaymentSteps([p(5000, "2026-09-01"), p(3000, "2026-09-10"), p(2000, "2026-09-20"), p(1000, "2026-10-01")], 0, "", false);
    expect(steps.map((s) => s.label)).toEqual(["Advance", "Payment 2", "Final payment"]);
    expect(steps[2].amount).toBe("₹3,000");
  });
  it("calls a single payment in full the full payment", () => {
    expect(buildPaymentSteps([p(5000, "2026-09-01")], 0, "", false)[0].label).toBe("Full payment");
  });
});

describe("invoice details", () => {
  it("leaves out lines with no value instead of printing N/A", () => {
    const vm = build(invoice([item("Package", 1000)]), booking("2026-12-01", { location: "" }));
    expect(vm.billTo.lines.map((l) => l.icon)).toEqual(["phone", "calendar"]);
    expect(vm.from.lines.some((l) => l.text.startsWith("GSTIN"))).toBe(false);
    expect(vm.event.map((e) => e.label)).toEqual(["Event date", "Package"]);
    expect(vm.payment?.bank).toBeUndefined();
  });

  it("uses the studio's own GSTIN and bank details when they are set", () => {
    const vm = build(invoice([item("Package", 1000)]), booking("2026-12-01"), [], {
      studio_gstin: "33ABCDE1234F1Z5", studio_bank_account_number: "123456789", studio_bank_ifsc: "HDFC0000001", studio_bank_name: "HDFC Bank",
    });
    expect(vm.from.lines).toContainEqual({ icon: "file", text: "GSTIN: 33ABCDE1234F1Z5" });
    expect(vm.payment?.bank).toMatchObject({ accountNumber: "123456789", ifsc: "HDFC0000001", bankName: "HDFC Bank" });
  });

  it("describes the package line with the booking's package and inclusions", () => {
    const vm = build(invoice([item("Wedding Package", 40000)]), booking("2026-12-01", { packageName: "Gold", inclusions: ["Candid", "Drone"] }));
    expect(vm.items[0]).toMatchObject({ title: "Wedding Package", subtitle: "Gold — Candid · Drone", qty: "1", total: "₹40,000" });
  });

  it("picks an icon from the item's wording", () => {
    expect(itemIcon("Premium Album 12x36")).toBe("album");
    expect(itemIcon("Drone coverage")).toBe("drone");
    expect(itemIcon("Candid videography")).toBe("video");
    expect(itemIcon("Wedding Package")).toBe("camera");
  });

  it("formats dates as Indian calendar days", () => {
    // 18:30 UTC is already the next day in India
    expect(formatDate(new Date("2026-11-07T18:30:00Z"))).toBe("8 November 2026");
    expect(formatDate(null)).toBeUndefined();
  });
});

describe("order invoice", () => {
  const order = (extra: Record<string, unknown> = {}) => ({
    id: "cmorder000000000001f0974", orderNumber: "#MDorder-1F0974", clientName: "Vellathai", clientPhone: "9042412862",
    quantity: 2, status: "PROCESSING", date: day("2026-10-20"), createdAt: day("2026-10-20"), dueDate: day("2026-11-20"),
    discountAmount: 100, customData: { amount: 2200, advanceAmount: 500 }, product: { name: "Photoframe 12x18", description: "Wooden frame" },
    payments: [{ amount: 500, date: day("2026-10-20") }],
    ...extra,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildOrder = (o: any, settings: Record<string, string> = {}) => buildOrderInvoiceViewModel(o, settings, { assetBase: "https://example.test", now: NOW });

  it("uses the order screen's figures: amount minus discount minus payments", () => {
    const vm = buildOrder(order());
    expect(vm.invoiceNumber).toBe("MDorder-1F0974");
    expect(vm.status).toBe("PARTIALLY_PAID");
    expect(vm.summaryRows.map((r) => `${r.label} ${r.value}`)).toEqual(["Subtotal ₹2,200", "Discount - ₹100", "Total ₹2,100", "Amount paid - ₹500"]);
    expect(vm.balanceDue).toBe("₹1,600");
    expect(vm.items).toEqual([{ title: "Photoframe 12x18", subtitle: "Wooden frame", icon: "image", qty: "2", unitPrice: "₹1,100", total: "₹2,200" }]);
  });

  it("shows the order's details and no couple placeholder", () => {
    const vm = buildOrder(order());
    expect(vm.detailsTitle).toBe("ORDER INFORMATION");
    expect(vm.event.map((e) => `${e.label}: ${e.value}`)).toEqual(["Order date: 20 October 2026", "Delivery date: 20 November 2026", "Product: Photoframe 12x18", "Status: In production"]);
    expect(vm.heroImageUrl).toBeUndefined();
    expect(vm.terms[0]).toMatch(/due by the designated due date/);
  });

  it("is overdue once the delivery date passes with nothing paid, and paid when settled", () => {
    expect(buildOrder(order({ payments: [], dueDate: day("2026-10-01") })).status).toBe("OVERDUE");
    expect(buildOrder(order({ payments: [{ amount: 2100, date: day("2026-10-25") }] })).status).toBe("PAID");
  });

  it("falls back to the id for orders without a number, and to customData's discount", () => {
    const vm = buildOrder(order({ orderNumber: null, discountAmount: 0, customData: { amount: 1000, discountAmount: 200 } }));
    expect(vm.invoiceNumber).toBe("MDorder-1F0974");
    expect(vm.summaryRows).toContainEqual({ label: "Discount", value: "- ₹200", tone: "discount" });
  });

  it("uses the order terms from settings when set", () => {
    expect(buildOrder(order(), { studio_order_terms: "Collect within 7 days\nNo returns on custom prints" }).terms).toEqual(["Collect within 7 days", "No returns on custom prints"]);
  });
});
