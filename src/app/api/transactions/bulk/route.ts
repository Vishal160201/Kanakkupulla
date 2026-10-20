import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { generateTransactionIds } from "@/lib/transactionId";
import { resolveShopForWrite, ShopError } from "@/lib/shops";
import { parseJsonBody } from "@/lib/validations/http";
import { pickCustomFields } from "@/lib/validations/common";
import { bulkTransactionSchema } from "@/lib/validations/transactions";

export async function POST(request: Request) {
  try {
    const auth = await requirePermission("manage_transactions");
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const parsed = await parseJsonBody(request, bulkTransactionSchema);
    if (parsed.error) return parsed.error;
    const body = parsed.data;

    // Generate a unique groupId for this bulk operation
    const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const transactionIds = await generateTransactionIds(body.length);
    // The schema guarantees every entry names the same shop (or none → default shop)
    const shopId = await resolveShopForWrite(body[0]?.shopId);

    const transactionsData = body.map((tx, i) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shopId is resolved once for the whole group
      const { amount, type, date, category, paymentMode, description, status, recordDate, shopId: _itemShopId, ...restBody } = tx;
      const customData = pickCustomFields(restBody);
      return {
        transactionId: transactionIds[i],
        amount,
        type,
        date: recordDate ?? date,
        category,
        paymentMode,
        description: description?.trim() || null,
        status: status || "SETTLED",
        customData: Object.keys(customData).length > 0 ? customData : undefined,
        user: { connect: { id: userId } },
        shop: { connect: { id: shopId } },
        groupId,
      };
    });

    // Insert all transactions atomically
    const newTransactions = await prisma.$transaction(
      transactionsData.map(data => prisma.transaction.create({ data }))
    );

    return NextResponse.json(newTransactions, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to bulk create transactions:", error);
    return NextResponse.json({ error: "Failed to bulk create transactions." }, { status: 500 });
  }
}
