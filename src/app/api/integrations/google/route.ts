import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const account = await prisma.account.findFirst({
      where: {
        userId: auth.user.id,
        provider: "google-drive"
      },
      select: { access_token: true, refresh_token: true },
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
        const userInfo: { email?: unknown } = await userInfoRes.json();
        if (typeof userInfo.email === "string" && userInfo.email) email = userInfo.email;
      } else if (userInfoRes.status === 401 && !account.refresh_token) {
        return NextResponse.json({ connected: false, reauthRequired: true });
      }
    } catch (e) {
      console.error("Google userinfo lookup failed:", e);
    }

    return NextResponse.json({ connected: true, email });
  } catch (error) {
    console.error("Google integration status failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const account = await prisma.account.findFirst({
      where: {
        userId: auth.user.id,
        provider: "google-drive"
      },
      select: { access_token: true },
    });

    if (account?.access_token) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.access_token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
      } catch (e) {
        console.error("Google token revoke failed:", e);
      }
    }

    await prisma.account.deleteMany({
      where: {
        userId: auth.user.id,
        provider: "google-drive"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google integration disconnect failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
