import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOwner } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { invoiceSettingsSchema } from "@/lib/validations/settings";
import { INVOICE_SETTING_DEFAULTS, INVOICE_SETTING_KEYS } from "@/lib/invoiceSettings";

export const dynamic = "force-dynamic";

/** Saved studio_* values as strings (rows written elsewhere may hold numbers or booleans). */
async function readValues() {
  const rows = await prisma.systemSetting.findMany({ where: { key: { in: [...INVOICE_SETTING_KEYS] } }, select: { key: true, value: true } });
  const values: Record<string, string> = {};
  for (const r of rows) if (typeof r.value === "string" || typeof r.value === "number") values[r.key] = String(r.value);
  return values;
}

// GET /api/settings/invoice — the studio details printed on invoices, plus the defaults used when one is blank. Owner only.
export async function GET() {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  return NextResponse.json({ values: await readValues(), defaults: INVOICE_SETTING_DEFAULTS }, { headers: { "Cache-Control": "private, no-store" } });
}

// PUT /api/settings/invoice — saves the fields sent; an empty field is removed so the default applies again.
export async function PUT(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;
  const parsed = await parseJsonBody(request, invoiceSettingsSchema);
  if (parsed.error) return parsed.error;

  const entries = Object.entries(parsed.data) as [string, string | undefined][];
  const toDelete = entries.filter(([, v]) => !v).map(([k]) => k);
  const toSave = entries.filter((e): e is [string, string] => !!e[1]);
  await prisma.$transaction([
    prisma.systemSetting.deleteMany({ where: { key: { in: toDelete } } }),
    ...toSave.map(([key, value]) => prisma.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } })),
  ]);
  return NextResponse.json({ values: await readValues() });
}
