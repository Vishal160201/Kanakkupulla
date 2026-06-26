import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await req.json();
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: (session.user as any).id,
        provider: "google-drive"
      }
    });

    if (!account || !account.access_token) {
      return NextResponse.json({ error: "No Google Drive account connected" }, { status: 404 });
    }

    // Call Google Drive API to add "anyone with link can view" permission
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${account.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to share Google Drive file", errorData);
      return NextResponse.json({ error: "Failed to share file" }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting file permissions", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
