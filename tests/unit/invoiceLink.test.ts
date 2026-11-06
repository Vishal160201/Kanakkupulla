import { describe, expect, it } from "vitest";
import { createInvoiceToken, readInvoiceToken } from "@/lib/invoiceLink";

const secret = "test-secret";
const NOW = Date.UTC(2026, 10, 6);
const id = "cmw4m5kpm0000m6rt6jctvjsi";

describe("invoice share links", () => {
  it("opens the invoice it was made for, until it expires", () => {
    const { token, expiresAt } = createInvoiceToken(id, { now: NOW, secret });
    expect(readInvoiceToken(token, { now: NOW, secret })).toEqual({ kind: "booking", id });
    expect(expiresAt.getTime() - NOW).toBeCloseTo(30 * 86400000, -4);
    expect(readInvoiceToken(token, { now: NOW + 31 * 86400000, secret })).toBeNull();
  });

  it("rejects tampering: another invoice id, a later expiry, a different secret or junk", () => {
    const { token } = createInvoiceToken(id, { now: NOW, secret });
    const [, exp, sig] = token.split(".");
    expect(readInvoiceToken(`cmw4m5kpm0000m6rt6jctvjsX.${exp}.${sig}`, { now: NOW, secret })).toBeNull();
    expect(readInvoiceToken(`${id}.zzzzzz.${sig}`, { now: NOW, secret })).toBeNull();
    expect(readInvoiceToken(token, { now: NOW, secret: "other" })).toBeNull();
    for (const junk of ["", "a.b", `${id}..`, `${id}.${exp}.${sig}x`, "../../etc.passwd.x"]) {
      expect(readInvoiceToken(junk, { now: NOW, secret })).toBeNull();
    }
  });

  it("keeps order links separate from booking links", () => {
    const order = createInvoiceToken(id, { kind: "order", now: NOW, secret }).token;
    expect(order.startsWith("o.")).toBe(true);
    expect(readInvoiceToken(order, { now: NOW, secret })).toEqual({ kind: "order", id });
    // Reusing a signature across the two kinds fails
    expect(readInvoiceToken(order.slice(2), { now: NOW, secret })).toBeNull();
    const booking = createInvoiceToken(id, { now: NOW, secret }).token;
    expect(readInvoiceToken(`o.${booking}`, { now: NOW, secret })).toBeNull();
  });
});
