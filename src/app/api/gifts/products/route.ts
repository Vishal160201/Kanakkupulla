import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { GIFTS_PRODUCTS } from "@/lib/gifts-config";

export async function GET() {
  try {
    // Upsert products to ensure they exist in DB
    for (const p of GIFTS_PRODUCTS) {
      await prisma.product.upsert({
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
      });
    }

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
    console.error("Fetch products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
