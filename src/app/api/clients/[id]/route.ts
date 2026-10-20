import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAccess, requireOwner } from "@/lib/authz";
import { parseJsonBody } from "@/lib/validations/http";
import { clientUpdateSchema } from "@/lib/validations/clients";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "VIEW");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const client = await prisma.client.findUnique({
      where: { id },
      include: { bookings: { orderBy: { date: "desc" }, take: 200 } },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(client, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch client:", error);
    return NextResponse.json({ error: "Failed to fetch client" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAccess("bookings", "MANAGE");
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    const parsed = await parseJsonBody(request, clientUpdateSchema);
    if (parsed.error) return parsed.error;
    const { name, phone, email } = parsed.data;

    const updated = await prisma.client.update({
      where: { id },
      data: { name, phone, email },
    });

    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to update client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if (auth.error) return auth.error;

  try {
    const id = (await params).id;
    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to delete client:", error);
    return NextResponse.json({ error: "Failed to delete client" }, { status: 500 });
  }
}
