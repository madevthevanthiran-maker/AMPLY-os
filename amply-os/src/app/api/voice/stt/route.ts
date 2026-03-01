// src/app/api/voice/stt/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.VOICE_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.VOICE_API_KEY || "";
const STT_MODEL = process.env.VOICE_STT_MODEL || "whisper-1";

// Tier gating (simple v1): require header x-amply-tier >= 2
function requireTier2(req: Request) {
  const tier = Number(req.headers.get("x-amply-tier") || "1");
  return tier >= 2;
}

export async function POST(req: Request) {
  try {
    if (!requireTier2(req)) {
      return NextResponse.json({ ok: false, error: "Tier 2 required" }, { status: 403 });
    }
    if (!API_KEY) {
      return NextResponse.json({ ok: false, error: "VOICE_API_KEY missing" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing audio file (form field: file)" }, { status: 400 });
    }

    const upstream = new FormData();
    upstream.append("model", STT_MODEL);
    upstream.append("file", file, file.name || "audio.webm");

    const res = await fetch(`${BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}` },
      body: upstream,
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `STT failed: ${res.status} ${t}` }, { status: 500 });
    }

    const json = await res.json();
    const text = typeof json?.text === "string" ? json.text : "";

    return NextResponse.json({ ok: true, text });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
