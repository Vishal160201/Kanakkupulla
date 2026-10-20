import type { Prisma } from "@prisma/client";
import prisma, { type AppPrismaClient } from "@/lib/prisma";
import { clearAccessCache } from "@/lib/authz";
import { ShopError } from "@/lib/shops";

type Tx = Omit<AppPrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

/** Checks per-shop assignments refer to real shops and roles (one entry per shop). */
export async function validateAssignments(db: Tx, assignments: { shopId: string; roleId: string }[]) {
  const unique = [...new Map(assignments.map(a => [a.shopId, a])).values()];
  const [shops, roles] = await Promise.all([
    db.shop.findMany({ where: { id: { in: unique.map(a => a.shopId) } }, select: { id: true } }),
    db.accessRole.findMany({ where: { id: { in: [...new Set(unique.map(a => a.roleId))] } }, select: { id: true } }),
  ]);
  if (shops.length !== unique.length) throw new ShopError("One of the shops no longer exists.", 422);
  const roleIds = new Set(roles.map(r => r.id));
  if (unique.some(a => !roleIds.has(a.roleId))) throw new ShopError("Unknown role.", 422);
  return unique;
}

/** Replaces a member's shop assignments (owners have none). */
export async function setUserAssignments(db: Tx, userId: string, assignments: { shopId: string; roleId: string }[]) {
  await db.shopMember.deleteMany({ where: { userId, shopId: { notIn: assignments.map(a => a.shopId) } } });
  for (const a of assignments) {
    await db.shopMember.upsert({
      where: { shopId_userId: { shopId: a.shopId, userId } },
      update: { roleId: a.roleId },
      create: { shopId: a.shopId, userId, roleId: a.roleId },
    });
  }
  clearAccessCache(userId);
}

export const userAssignmentsSelect = {
  shopMemberships: { select: { shopId: true, roleId: true, role: { select: { key: true } } } },
} satisfies Prisma.UserSelect;

export function formatAssignments(rows: { shopId: string; roleId: string; role: { key: string } }[]) {
  return rows.map(r => ({ shopId: r.shopId, roleId: r.roleId, roleKey: r.role.key }));
}
