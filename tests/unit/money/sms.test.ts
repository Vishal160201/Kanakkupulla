import { describe, expect, it } from "vitest";
import { parseBankSms } from "@/lib/money/parsers/sms";

// Made-up alerts in the shapes Indian banks send (no real names, numbers or references)
const RECEIVED = "2026-11-14";
const ok = (text: string) => {
  const r = parseBankSms(text, RECEIVED);
  if (!r.ok) throw new Error(`expected a payment, got: ${r.reason}`);
  return r.txn;
};
const skip = (text: string) => {
  const r = parseBankSms(text, RECEIVED);
  expect(r.ok).toBe(false);
  return r.ok ? "" : r.reason;
};

describe("bank SMS: UPI payments from the bank account", () => {
  it("multi-line 'Sent ... To ...' alert", () => {
    const t = ok("Sent Rs.250.00\nFrom HDFC Bank A/C *1234\nTo SAMPLE CAFE\nOn 14/11/26\nRef 431800000001\nNot You?\nCall 18000000000/SMS BLOCK UPI to 9000000000");
    expect(t).toMatchObject({ amount: "250.00", direction: "DEBIT", last4: "1234", bank: "HDFC", date: "2026-11-14", counterparty: "SAMPLE CAFE", refNo: "431800000001", isCard: false, cardPayment: false });
  });

  it("'debited ... to VPA' alert", () => {
    const t = ok("Rs.1,499.50 debited from A/c XX5678 on 13-11-26 to VPA shop.sample@okaxis (UPI Ref No 431800000002). Not you? Call 18000000000 -KVB");
    expect(t).toMatchObject({ amount: "1499.50", direction: "DEBIT", last4: "5678", bank: "KVB", date: "2026-11-13", upiId: "shop.sample@okaxis", counterparty: "SHOP SAMPLE", refNo: "431800000002" });
  });

  it("long masked account and a dd-Mon-yyyy date", () => {
    const t = ok("Your A/c XXXXXXXX5678 is debited by Rs.75.00 on 12-Nov-2026 towards UPI/431800000003/to tea.stall@ybl. Avl Bal Rs.10,000.00 - Karur Vysya Bank");
    expect(t).toMatchObject({ amount: "75.00", last4: "5678", date: "2026-11-12", refNo: "431800000003", upiId: "tea.stall@ybl", bank: "KVB" });
  });

  it("money received", () => {
    const t = ok("Received Rs.6621.00 in your HDFC Bank A/c xx1234 from VPA friend.sample@oksbi (UPI 431800000004)");
    expect(t).toMatchObject({ amount: "6621.00", direction: "CREDIT", last4: "1234", upiId: "friend.sample@oksbi" });
  });

  it("deposit by NEFT", () => {
    const t = ok("Update! INR 50,000.00 deposited in HDFC Bank A/c XX1234 on 31-OCT-26 for NEFT Cr-SAMPLE CORP LTD. Avl bal INR 60,000.00");
    expect(t).toMatchObject({ amount: "50000.00", direction: "CREDIT", date: "2026-10-31" });
  });

  it("a refund counts as money in, even though 'debited' appears later", () => {
    expect(ok("Rs.120.00 refunded to your A/c XX1234 for the txn debited on 10-11-26. Ref 431800000005").direction).toBe("CREDIT");
  });
});

describe("bank SMS: credit cards", () => {
  it("a card spend at a merchant", () => {
    const t = ok("Spent Rs.250 On HDFC Bank Card 4321 At SAMPLE STORE On 2026-11-14:10:15:22 Bal Rs.12345 Not You? Call 18000000000");
    expect(t).toMatchObject({ amount: "250.00", direction: "DEBIT", last4: "4321", isCard: true, date: "2026-11-14", counterparty: "SAMPLE STORE" });
  });

  it("a UPI spend on a RuPay credit card (Kiwi-style)", () => {
    const t = ok("INR 349.00 spent on YES BANK Card X9876 @UPI_SAMPLE FOODS 14-11-2026 08:15:32 PM. Avl Lmt INR 20,000.00. SMS BLKCC 9876 to 9000000000 if not you");
    expect(t).toMatchObject({ amount: "349.00", isCard: true, last4: "9876", bank: "YES", counterparty: "SAMPLE FOODS", date: "2026-11-14" });
  });

  it("the card's 'payment received' alert is skipped (the bank's debit already counts it)", () => {
    expect(skip("Payment of Rs.5,000.00 has been received on your YES BANK Credit Card XX9876. Thank you.")).toMatch(/card bill payment/);
  });

  it("a bank debit that pays a card is marked as a card payment", () => {
    expect(ok("Rs.5000.00 debited from A/c XX5678 on 14-11-26 to VPA kiwi.sample@yesbank for credit card bill. Ref 431800000006").cardPayment).toBe(true);
  });

  it("a debit card spend is a bank spend, not a credit card", () => {
    expect(ok("Rs.500.00 spent on your HDFC Bank Debit Card ending 1234 at SAMPLE FUEL on 14-11-26").isCard).toBe(false);
  });
});

describe("bank SMS: messages that aren't payments", () => {
  it.each([
    ["OTP", "123456 is your OTP for a txn of Rs.250.00 at SAMPLE STORE. Do not share."],
    ["failed", "Txn of Rs.250.00 from A/c XX1234 failed. Any amount debited will be reversed."],
    ["reminder", "Your card bill of Rs.12,000.00 is due on 01-12-26. Minimum due Rs.600."],
    ["will be debited", "Rs.999.00 will be debited from A/c XX1234 on 15-11-26 for SAMPLE OTT."],
    ["request", "SAMPLE NAME has requested Rs.500.00 from you on UPI. Approve in your app."],
    ["mandate", "E-mandate of Rs.199.00 registered on your card XX9876 for SAMPLE MUSIC."],
    ["offer", "Get cashback upto Rs.500 on your next 3 payments! Apply now."],
    ["no amount", "Your A/c XX1234 KYC is updated. Thank you."],
  ])("%s", (_label, text) => {
    expect(skip(text)).toBeTruthy();
  });
});

describe("bank SMS: dates", () => {
  it("uses no date when the text's date is far from when it arrived", () => {
    expect(ok("Rs.100.00 debited from A/c XX1234 on 14-11-24 to VPA a.b@okaxis").date).toBeNull();
  });
  it("ignores impossible dates", () => {
    expect(ok("Rs.100.00 debited from A/c XX1234 on 31/02/26 to VPA a.b@okaxis").date).toBeNull();
  });
  it("amounts keep exact paise", () => {
    expect(ok("Rs.0.50 debited from A/c XX1234 on 14/11/26").amount).toBe("0.50");
    expect(ok("INR 1,00,000 credited to A/c XX1234 on 14/11/26").amount).toBe("100000.00");
  });
});
