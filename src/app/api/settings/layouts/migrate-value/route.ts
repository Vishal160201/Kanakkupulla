import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { layoutMigrateValueSchema } from "@/lib/validations/settings";

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(req, layoutMigrateValueSchema);
    if (parsed.error) return parsed.error;
    const { formKey, fieldId, oldValue, newValue } = parsed.data;

    let updatedCount = 0;

    if (formKey === "BOOKING_FORM") {
      if (fieldId === "fld_b_category") {
        const res = await prisma.booking.updateMany({
          where: { category: oldValue },
          data: { category: newValue },
        });
        updatedCount = res.count;
      } else if (fieldId === "fld_b_status") {
        const res = await prisma.booking.updateMany({
          where: { status: oldValue },
          data: { status: newValue },
        });
        updatedCount = res.count;
      }
    } else if (formKey === "TRANSACTION_FORM") {
      if (fieldId === "fld_tx_type") {
        const res = await prisma.transaction.updateMany({
          where: { type: oldValue },
          data: { type: newValue },
        });
        updatedCount = res.count;
      } else if (fieldId === "fld_tx_category") {
        const res = await prisma.transaction.updateMany({
          where: { category: oldValue },
          data: { category: newValue },
        });
        updatedCount = res.count;
      } else if (fieldId === "fld_tx_mode") {
        const res = await prisma.transaction.updateMany({
          where: { paymentMode: oldValue },
          data: { paymentMode: newValue },
        });
        updatedCount = res.count;
      }
    }

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Failed to migrate value:", error);
    return NextResponse.json({ error: "Failed to migrate value" }, { status: 500 });
  }
}
