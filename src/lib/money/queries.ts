import prisma from "@/lib/prisma";
import { serializeAccount } from "./accounts";

/** The tracker's accounts as the API returns them (for server-rendered first paint). */
export async function listAccounts(userId: string) {
  const accounts = await prisma.moneyAccount.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { transactions: true, imports: true } } },
  });
  return accounts.map(({ _count, ...account }) => serializeAccount(account, _count));
}
