import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { formKey, fieldId, oldValue, newValue } = body;

    if (!formKey || !fieldId || !oldValue || !newValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
    console.error("Error migrating value:", error);
    return NextResponse.json({ error: "Failed to migrate value" }, { status: 500 });
  }
}
