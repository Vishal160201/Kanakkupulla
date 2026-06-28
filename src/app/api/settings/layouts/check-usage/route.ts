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
    const { formKey, fieldId, value } = body;

    if (!formKey || !fieldId || !value) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

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
    return NextResponse.json({ error: "Failed to check usage" }, { status: 500 });
  }
}
