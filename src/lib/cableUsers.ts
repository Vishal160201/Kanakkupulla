import prisma from "@/lib/prisma";

/** People who can work in a shop (owners + its members), for assigning complaints and naming collectors. */
export async function shopPeople(shopId: string) {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", OR: [{ role: "OWNER" }, { shopMemberships: { some: { shopId } } }] },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name || u.email || "Unnamed user" }));
}

/** id → display name for the given user ids (deactivated users included, so old records keep their names). */
export async function userNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, name: true, email: true } });
  return new Map(users.map((u) => [u.id, u.name || u.email || "Unnamed user"]));
}
