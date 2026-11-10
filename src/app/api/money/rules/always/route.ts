import prisma from "@/lib/prisma";
import { encryptText } from "@/lib/money/crypto";
import { json, moneyRoute, notFound } from "@/lib/money/server/route";
import { toTxnDTO } from "@/lib/money/server/rows";
import { applyRuleToPast } from "@/lib/money/server/rulesApply";
import { parseJsonBody } from "@/lib/validations/http";
import { moneyAlwaysSchema } from "@/lib/validations/money";

/**
 * POST /api/money/rules/always — "Always categorise this counterparty as…": a rule on the
 * transaction's counterparty (or UPI ID, or narration when it has neither), applied to past rows too.
 */
export const POST = moneyRoute("POST /api/money/rules/always", async ({ user, request }) => {
  const parsed = await parseJsonBody(request, moneyAlwaysSchema);
  if (parsed.error) return parsed.error;
  const row = await prisma.moneyTransaction.findFirst({ where: { id: parsed.data.txnId, userId: user.id } });
  if (!row) return notFound("Transaction not found");
  if (!(await prisma.moneyCategory.findFirst({ where: { id: parsed.data.categoryId, userId: user.id }, select: { id: true } }))) {
    return json({ error: "Category not found" }, { status: 422 });
  }
  const txn = toTxnDTO(row);
  const field = parsed.data.field ?? (txn.counterparty ? "COUNTERPARTY" : txn.upiId ? "UPI_ID" : "NARRATION");
  const pattern = parsed.data.pattern ?? (field === "COUNTERPARTY" ? txn.counterparty : field === "UPI_ID" ? txn.upiId : txn.narration.slice(0, 60));
  if (!pattern || pattern.length < 2) return json({ error: "This transaction has nothing to build a rule from." }, { status: 422 });

  const rule = await prisma.moneyRule.create({
    data: { userId: user.id, priority: 50, field, pattern: encryptText(pattern), isRegex: false, categoryId: parsed.data.categoryId },
  });
  const applied = await applyRuleToPast(user.id, { id: rule.id, priority: 50, field, pattern, isRegex: false, categoryId: parsed.data.categoryId });
  return json({ ruleId: rule.id, field, pattern, applied }, { status: 201 });
});
