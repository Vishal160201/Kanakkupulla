import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMoneyUser } from "@/lib/money/auth";
import { outstandingAsOf, serializeAccount } from "@/lib/money/accounts";
import { listAccounts } from "@/lib/money/queries";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyAccountSchema } from "@/lib/validations/money";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

// GET /api/money/accounts — the tracker's bank accounts and cards, in display order.
export async function GET() {
  const auth = await requireMoneyUser();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json(await listAccounts(auth.user.id), { headers: NO_STORE });
  } catch (error) {
    console.error("GET /api/money/accounts failed:", error);
    return NextResponse.json({ error: "Couldn't load accounts" }, { status: 500 });
  }
}

// POST /api/money/accounts — add an account (added at the end of the list).
export async function POST(request: Request) {
  const auth = await requireMoneyUser();
  if (auth.error) return auth.error;
  const parsed = await parseJsonBody(request, moneyAccountSchema);
  if (parsed.error) return parsed.error;
  try {
    const last = await prisma.moneyAccount.findFirst({
      where: { userId: auth.user.id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const account = await prisma.moneyAccount.create({
      data: {
        ...parsed.data,
        outstandingAsOf: outstandingAsOf(parsed.data.outstanding),
        manualBalanceAsOf: outstandingAsOf(parsed.data.manualBalance),
        userId: auth.user.id,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
    return NextResponse.json(serializeAccount(account), { status: 201 });
  } catch (error) {
    console.error("POST /api/money/accounts failed:", error);
    return NextResponse.json({ error: "Couldn't save the account" }, { status: 500 });
  }
}
