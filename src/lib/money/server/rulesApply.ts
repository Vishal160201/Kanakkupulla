import prisma from "@/lib/prisma";
import { ruleMatches, type RuleInput } from "../rules";
import { loadTxns } from "./rows";

/**
 * Applies one rule to past transactions (the "always categorise" action and new rules).
 * Self transfers and pass-throughs keep their kind; only the category moves.
 */
export async function applyRuleToPast(userId: string, rule: RuleInput): Promise<number> {
  const txns = await loadTxns(userId);
  const hits = txns.filter((t) => ruleMatches(rule, { narration: t.narration, counterparty: t.counterparty, upiId: t.upiId, direction: t.direction }));
  if (hits.length === 0) return 0;
  const keepKind = new Set(["SELF_TRANSFER", "PASS_THROUGH"]);
  await prisma.$transaction(
    hits.map((t) =>
      prisma.moneyTransaction.update({
        where: { id: t.id },
        data: {
          ...(rule.categoryId ? { categoryId: rule.categoryId } : {}),
          ...(rule.kind && !keepKind.has(t.kind) ? { kind: rule.kind, counterAccountId: rule.kind === "CARD_PAYMENT" ? rule.targetAccountId ?? null : null } : {}),
        },
      }),
    ),
  );
  return hits.length;
}
