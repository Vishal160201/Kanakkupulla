import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clearAccessCache, requireOwner } from "@/lib/authz";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { shopMembersSchema, shopParamsSchema } from "@/lib/validations/shops";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/shops/[id]/members — replace who (besides owners) can open a shop and their role. Owner only.
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const route = parseParams(await params, shopParamsSchema);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, shopMembersSchema);
  if (body.error) return body.error;

  const { id } = route.data;
  // One role per person per shop; the last entry for a user wins
  const members = [...new Map(body.data.members.map(m => [m.userId, m])).values()];

  try {
    const shop = await prisma.shop.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    const [users, roles] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: members.map(m => m.userId) } }, select: { id: true, role: true } }),
      prisma.accessRole.findMany({ where: { id: { in: [...new Set(members.map(m => m.roleId))] } }, select: { id: true, key: true } }),
    ]);
    if (users.length !== members.length) return NextResponse.json({ error: "One or more users no longer exist." }, { status: 422 });
    if (users.some(u => u.role === "OWNER")) {
      return NextResponse.json({ error: "Owners already have access to every shop." }, { status: 422 });
    }
    const roleKeys = new Map(roles.map(r => [r.id, r.key]));
    if (members.some(m => !roleKeys.has(m.roleId))) return NextResponse.json({ error: "Unknown role." }, { status: 422 });

    await prisma.$transaction([
      prisma.shopMember.deleteMany({ where: { shopId: id, userId: { notIn: members.map(m => m.userId) } } }),
      ...members.map(m =>
        prisma.shopMember.upsert({
          where: { shopId_userId: { shopId: id, userId: m.userId } },
          update: { roleId: m.roleId },
          create: { shopId: id, userId: m.userId, roleId: m.roleId },
        })
      ),
      prisma.systemLog.create({
        data: { action: "SHOP_MEMBERS_UPDATED", details: `Set ${members.length} member(s) for shop ${shop.name} (${id})`, userId: auth.user.id },
      }),
    ]);
    clearAccessCache();

    return NextResponse.json({ members: members.map(m => ({ ...m, roleKey: roleKeys.get(m.roleId) })) });
  } catch (error) {
    console.error("Failed to update shop members:", error);
    return NextResponse.json({ error: "Failed to update shop members" }, { status: 500 });
  }
}
