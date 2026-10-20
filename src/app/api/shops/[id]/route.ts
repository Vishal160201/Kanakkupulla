import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { getDefaultShopId, setDefaultShopId, shopNameTaken, ShopError } from "@/lib/shops";
import { parseJsonBody, parseParams } from "@/lib/validations/http";
import { shopParamsSchema, shopUpdateSchema } from "@/lib/validations/shops";

type Ctx = { params: Promise<{ id: string }> };

/** Another active shop to take over as default, or null when `shopId` is the last one. */
async function nextActiveShop(db: Pick<typeof prisma, "shop">, shopId: string) {
  return db.shop.findFirst({
    where: { id: { not: shopId }, isArchived: false },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

// PUT /api/shops/[id] — rename, recolour, set default, archive/unarchive. Admin only.
export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const route = parseParams(await params, shopParamsSchema);
  if (route.error) return route.error;
  const body = await parseJsonBody(request, shopUpdateSchema);
  if (body.error) return body.error;

  const { id } = route.data;
  const { name, color, icon, isDefault, isArchived } = body.data;

  if (isDefault && isArchived) {
    return NextResponse.json({ error: "An archived shop can't be the default." }, { status: 422 });
  }

  try {
    const existing = await prisma.shop.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    if (name && (await shopNameTaken(name, id))) {
      return NextResponse.json({ error: `A shop named "${name}" already exists.` }, { status: 409 });
    }
    if (isDefault && existing.isArchived && isArchived !== false) {
      return NextResponse.json({ error: "Unarchive this shop before making it the default." }, { status: 422 });
    }

    const updated = await prisma.$transaction(async tx => {
      const currentDefault = await getDefaultShopId(tx);

      if (isArchived === true && !existing.isArchived) {
        const replacement = await nextActiveShop(tx, id);
        if (!replacement) throw new ShopError("You can't archive the last active shop.", 409);
        // Archiving the default promotes the next active shop
        if (currentDefault === id) await setDefaultShopId(replacement.id, tx);
      }

      const shop = await tx.shop.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(icon !== undefined ? { icon } : {}),
          ...(isArchived !== undefined ? { isArchived } : {}),
        },
      });

      if (isDefault) await setDefaultShopId(id, tx);
      return shop;
    });

    const defaultShopId = await getDefaultShopId();
    return NextResponse.json({ shop: { ...updated, isDefault: updated.id === defaultShopId } });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: `A shop named "${name}" already exists.` }, { status: 409 });
    }
    console.error("Failed to update shop:", error);
    return NextResponse.json({ error: "Failed to update shop" }, { status: 500 });
  }
}

// DELETE /api/shops/[id] — only shops that never had entries. Admin only.
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const route = parseParams(await params, shopParamsSchema);
  if (route.error) return route.error;
  const { id } = route.data;

  try {
    const existing = await prisma.shop.findUnique({
      where: { id },
      include: { _count: { select: { transactions: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    // Counts trashed entries too: they still reference the shop until the recycle bin is emptied.
    if (existing._count.transactions > 0) {
      return NextResponse.json(
        {
          error: `"${existing.name}" has ${existing._count.transactions} ledger entr${existing._count.transactions === 1 ? "y" : "ies"} (including any in the recycle bin). Archive it instead.`,
        },
        { status: 409 }
      );
    }

    await prisma.$transaction(async tx => {
      const currentDefault = await getDefaultShopId(tx);
      if (!existing.isArchived) {
        const replacement = await nextActiveShop(tx, id);
        if (!replacement) throw new ShopError("You can't delete the last active shop.", 409);
        if (currentDefault === id) await setDefaultShopId(replacement.id, tx);
      }
      await tx.shop.delete({ where: { id } });
    });

    await prisma.systemLog.create({
      data: { action: "SHOP_DELETED", details: `Deleted shop ${existing.name} (${id})`, userId: auth.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "This shop still has ledger entries. Archive it instead." }, { status: 409 });
    }
    console.error("Failed to delete shop:", error);
    return NextResponse.json({ error: "Failed to delete shop" }, { status: 500 });
  }
}
