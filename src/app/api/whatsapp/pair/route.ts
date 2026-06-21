import { NextResponse } from "next/server";
import { requestWAPairingCode } from "@/lib/whatsapp";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const code = await requestWAPairingCode(phoneNumber);

    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("Error requesting pairing code:", error);
    return NextResponse.json({ error: "Failed to request pairing code" }, { status: 500 });
  }
}
