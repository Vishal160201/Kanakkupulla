import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { requireAccess } from "@/lib/authz";
import { parseJsonBody, parseSearchParams } from "@/lib/validations/http";
import { clientCreateSchema, clientListQuerySchema } from "@/lib/validations/clients";

export async function GET(request: Request) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;

  const query = parseSearchParams(request, clientListQuerySchema);
  if (query.error) return query.error;
  const { search, limit, offset } = query.data;

  try {
    const where: Prisma.ClientWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: { id: true, name: true, phone: true, email: true, createdAt: true },
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({ items: clients, total, limit, offset }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const parsed = await parseJsonBody(request, clientCreateSchema);
    if (parsed.error) return parsed.error;
    const { name, phone, email } = parsed.data;

    const newClient = await prisma.client.create({
      data: { name, phone, email: email || null },
    });

    return NextResponse.json(newClient, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to create client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
