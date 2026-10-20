import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GIFTS_PRODUCTS } from "@/lib/gifts-config";
import { requireAccess } from "@/lib/authz";

export async function GET() {
  const auth = await requireAccess("gifts", "VIEW");
  if (auth.error) return auth.error;

  try {
    // Make sure the configured products exist; only write when something is missing or renamed
    const existing = await prisma.product.findMany({
      where: { id: { in: GIFTS_PRODUCTS.map(g => g.id) } },
      select: { id: true, name: true }
    });
    const stale = GIFTS_PRODUCTS.filter(p => existing.find(e => e.id === p.id)?.name !== p.name);
    if (stale.length > 0) await prisma.$transaction(stale.map(p =>
      prisma.product.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          price: 0,
        },
        create: {
          id: p.id,
          name: p.name,
          price: 0,
        }
      })
    ));

    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: GIFTS_PRODUCTS.map(g => g.id) }
      }
    });

    // Merge with our static config to keep icons and fields
    const enrichedProducts = dbProducts.map(dbP => {
      const config = GIFTS_PRODUCTS.find(g => g.id === dbP.id);
      return {
        ...dbP,
        iconName: config?.icon.displayName
      };
    });

    return NextResponse.json({ products: enrichedProducts });
  } catch (error) {
    console.error("Failed to fetch gift products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
