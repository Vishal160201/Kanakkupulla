import { NextResponse } from "next/server";

const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const res = await fetch(`${BOT_URL}/api/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error requesting pairing code:", error);
    return NextResponse.json({ error: "Failed to request pairing code" }, { status: 500 });
  }
}
