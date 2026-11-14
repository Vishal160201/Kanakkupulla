import { STUDIO_DETAILS } from "@/lib/constants";

/** Studio details printed on invoices (SystemSetting rows, edited in Settings → Invoice details). */
export const INVOICE_SETTING_KEYS = [
  "studio_name",
  "studio_tagline",
  "studio_address",
  "studio_phone",
  "studio_email",
  "studio_gstin",
  "studio_upi_id",
  "studio_bank_account_name",
  "studio_bank_account_number",
  "studio_bank_ifsc",
  "studio_bank_name",
  "studio_instagram",
  "studio_website",
  "studio_review_url",
  "studio_terms",
  "studio_order_terms",
] as const;

export type InvoiceSettingKey = (typeof INVOICE_SETTING_KEYS)[number];

export const DEFAULT_INVOICE_TERMS = [
  "50% advance is required to confirm the booking.",
  "Balance to be cleared before the event or delivery.",
  "Album delivery within 30 working days after the event.",
  "Raw photos/videos will not be shared.",
  "Cancellation 15 days before the event is non-refundable.",
];

/** Gift / frame order invoices (the old order invoice's wording). */
export const DEFAULT_ORDER_TERMS = [
  "Please note that all invoices are due by the designated due date.",
  "For any questions about this invoice, please contact us.",
  `Thank you for choosing ${STUDIO_DETAILS.name} for your special moments.`,
];

/** What the invoice uses when a setting is left blank (shown as placeholders in the editor). */
export const INVOICE_SETTING_DEFAULTS: Partial<Record<InvoiceSettingKey, string>> = {
  studio_name: STUDIO_DETAILS.name,
  studio_tagline: "Capturing your memories",
  studio_address: STUDIO_DETAILS.address,
  studio_phone: STUDIO_DETAILS.phone,
  studio_email: STUDIO_DETAILS.email,
  studio_upi_id: STUDIO_DETAILS.upiId,
  studio_instagram: STUDIO_DETAILS.instagram,
  studio_website: STUDIO_DETAILS.website,
  studio_terms: DEFAULT_INVOICE_TERMS.join("\n"),
  studio_order_terms: DEFAULT_ORDER_TERMS.join("\n"),
};
