import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireOwner, requireUser } from "@/lib/authz";
import { accessibleShopsWhere, getDefaultShopId, setDefaultShopId, shopNameTaken, ShopError } from "@/lib/shops";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { shopCreateSchema, shopListQuerySchema } from "@/lib/validations/shops";

export const dynamic = "force-dynamic";

// GET /api/shops — shops the user can open (default first); ?includeArchived=true adds archived ones.
// Owners also get who is assigned to each shop.
export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, shopListQuerySchema);
  if (query.error) return query.error;
  const isOwner = auth.user.role === "OWNER";

  try {
    const [defaultShopId, shops] = await Promise.all([
      getDefaultShopId().catch(() => null),
      prisma.shop.findMany({
        where: { ...(query.data.includeArchived ? {} : { isArchived: false }), ...accessibleShopsWhere(auth.user) },
        orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
        include: {
          _count: { select: { transactions: true } },
          // Only returned to owners (see below); always selected so the row type stays simple
          members: { select: { userId: true, roleId: true, role: { select: { key: true } } } },
        },
      }),
    ]);

    const items = shops
      .map(({ _count, members, ...shop }) => ({
        ...shop,
        isDefault: shop.id === defaultShopId,
        transactionCount: _count.transactions,
        ...(isOwner ? { members: (members ?? []).map(m => ({ userId: m.userId, roleId: m.roleId, roleKey: m.role.key })) } : {}),
      }))
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));

    return NextResponse.json({ shops: items, defaultShopId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to fetch shops:", error);
    return NextResponse.json({ error: "Failed to fetch shops" }, { status: 500 });
  }
}

// POST /api/shops — admin only.
export async function POST(request: Request) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  const body = await parseJsonBody(request, shopCreateSchema);
  if (body.error) return body.error;
  const { name, color, icon, isDefault, type = "STUDIO" } = body.data;

  if (isDefault && type !== "STUDIO") {
    return NextResponse.json({ error: "Only a studio shop can be the default shop." }, { status: 422 });
  }

  try {
    if (await shopNameTaken(name)) {
      return NextResponse.json({ error: `A shop named "${name}" already exists.` }, { status: 409 });
    }

    const shop = await prisma.$transaction(async tx => {
      const created = await tx.shop.create({ data: { name, icon, type, ...(color ? { color } : {}) } });
      if (isDefault) await setDefaultShopId(created.id, tx);
      return created;
    });

    await prisma.systemLog.create({
      data: { action: "SHOP_CREATED", details: `Created shop ${shop.name} (${shop.id})`, userId: auth.user.id },
    });

    return NextResponse.json({ shop: { ...shop, isDefault: !!isDefault, transactionCount: 0, members: [] } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `A shop named "${name}" already exists.` }, { status: 409 });
    }
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create shop:", error);
    return NextResponse.json({ error: "Failed to create shop" }, { status: 500 });
  }
}
