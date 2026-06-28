import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: (session.user as any).id,
        provider: "google-drive"
      }
    });

    if (!account || !account.access_token) {
      return NextResponse.json({ connected: false });
    }

    // Try to get the user's email from Google to display it
    let email = "Connected Account";
    try {
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${account.access_token}` }
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        if (userInfo.email) email = userInfo.email;
      } else if (userInfoRes.status === 401 && !account.refresh_token) {
        return NextResponse.json({ connected: false, reauthRequired: true });
      }
    } catch (e) {
    }

    return NextResponse.json({ connected: true, email });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: (session.user as any).id,
        provider: "google-drive"
      }
    });

    if (account?.access_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${account.access_token}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
      } catch (e) {
      }
    }

    await prisma.account.deleteMany({
      where: {
        userId: (session.user as any).id,
        provider: "google-drive"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
