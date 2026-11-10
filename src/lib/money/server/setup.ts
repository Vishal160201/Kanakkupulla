import prisma from "@/lib/prisma";
import { encryptText } from "../crypto";
import { SEED_CATEGORIES, SEED_RULES, seedCardTarget } from "../rules";

/**
 * First visit: the plan's categories and rules (§10, §6.2). Runs once per user; after that
 * categories and rules are yours to change in Settings.
 */
export async function ensureMoneySetup(userId: string): Promise<void> {
  const existing = await prisma.moneyCategory.count({ where: { userId } });
  if (existing > 0) return;

  const accounts = await prisma.moneyAccount.findMany({ where: { userId }, select: { id: true, type: true, name: true, institution: true } });
  await prisma.$transaction(async (tx) => {
    // Another tab may have seeded in the meantime
    if ((await tx.moneyCategory.count({ where: { userId } })) > 0) return;
    await tx.moneyCategory.createMany({
      data: SEED_CATEGORIES.map((c, i) => ({ userId, name: c.name, color: c.color, icon: c.icon, sortOrder: i })),
    });
    const categories = await tx.moneyCategory.findMany({ where: { userId }, select: { id: true, name: true } });
    const idOf = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
    await tx.moneyRule.createMany({
      data: SEED_RULES.flatMap((rule) =>
        rule.patterns.map((pattern) => ({
          userId,
          priority: rule.priority,
          field: "NARRATION" as const,
          pattern: encryptText(pattern),
          isRegex: !!rule.isRegex,
          direction: rule.direction ?? null,
          categoryId: idOf(rule.category),
          kind: rule.kind ?? null,
          targetAccountId: seedCardTarget(rule.card, accounts),
        })),
      ),
    });
  });
}
