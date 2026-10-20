import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { InventoryValidationError } from "@/lib/inventory";
import { ShopError } from "@/lib/shops";

/** Maps inventory/shop errors to responses; anything else is logged as a 500. */
export function inventoryErrorResponse(error: unknown, fallback: string) {
  if (error instanceof InventoryValidationError) {
    return NextResponse.json({ error: error.message, errors: error.errors }, { status: error.status });
  }
  if (error instanceof ShopError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "That name is already used in this shop." }, { status: 409 });
  }
  console.error(`${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
