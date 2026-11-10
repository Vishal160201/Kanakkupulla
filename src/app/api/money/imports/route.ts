import prisma from "@/lib/prisma";
import { decryptOptional } from "@/lib/money/crypto";
import { json, moneyRoute } from "@/lib/money/server/route";

export const dynamic = "force-dynamic";

// GET /api/money/imports — what you've imported, newest first.
export const GET = moneyRoute("GET /api/money/imports", async ({ user }) => {
  const imports = await prisma.moneyImport.findMany({
    where: { userId: user.id },
    orderBy: { importedAt: "desc" },
    include: { _count: { select: { transactions: true } } },
    take: 200,
  });
  return json(
    imports.map((i) => ({
      id: i.id,
      accountId: i.accountId,
      sourceType: i.sourceType,
      filename: decryptOptional(i.filename),
      periodFrom: i.periodFrom?.toISOString().slice(0, 10) ?? null,
      periodTo: i.periodTo?.toISOString().slice(0, 10) ?? null,
      openingBalance: i.openingBalance?.toFixed(2) ?? null,
      closingBalance: i.closingBalance?.toFixed(2) ?? null,
      status: i.status,
      warnings: Array.isArray(i.warnings) ? i.warnings : [],
      importedAt: i.importedAt.toISOString(),
      transactionCount: i._count.transactions,
    })),
  );
});
