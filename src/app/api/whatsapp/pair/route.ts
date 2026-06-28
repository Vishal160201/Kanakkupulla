import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const BOT_URL = process.env.WHATSAPP_BOT_URL || "http://localhost:3001";
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
    return NextResponse.json({ error: "Failed to request pairing code" }, { status: 500 });
  }
}
