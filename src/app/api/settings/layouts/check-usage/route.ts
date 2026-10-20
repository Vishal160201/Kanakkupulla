import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { layoutCheckUsageSchema } from "@/lib/validations/settings";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(req, layoutCheckUsageSchema);
    if (parsed.error) return parsed.error;
    const { formKey, fieldId, value } = parsed.data;

    let count = 0;

    if (formKey === "BOOKING_FORM") {
      if (fieldId === "fld_b_category") {
        count = await prisma.booking.count({ where: { category: value } });
      } else if (fieldId === "fld_b_status") {
        count = await prisma.booking.count({ where: { status: value } });
      }
    } else if (formKey === "TRANSACTION_FORM") {
      if (fieldId === "fld_tx_type") {
        count = await prisma.transaction.count({ where: { type: value } });
      } else if (fieldId === "fld_tx_category") {
        count = await prisma.transaction.count({ where: { category: value } });
      } else if (fieldId === "fld_tx_mode") {
        count = await prisma.transaction.count({ where: { paymentMode: value } });
      }
    }

    return NextResponse.json({ inUse: count > 0, count });
  } catch (error) {
    console.error("Failed to check usage:", error);
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }
}
