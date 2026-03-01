// src/app/api/voice/tts/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE_URL = process.env.VOICE_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.VOICE_API_KEY || "";

// OpenAI-compatible TTS defaults
const TTS_MODEL = process.env.VOICE_TTS_MODEL || "gpt-4o-mini-tts";
const TTS_VOICE = process.env.VOICE_TTS_VOICE || "alloy"; // swap later

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

    const body = (await req.json().catch(() => ({}))) as Partial<{
      text: string;
      voice: string;
    }>;

    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      return NextResponse.json({ ok: false, error: "Missing text" }, { status: 400 });
    }

    const voice = typeof body.voice === "string" ? body.voice : TTS_VOICE;

    // OpenAI-compatible: POST /audio/speech returns audio bytes
    const res = await fetch(`${BASE_URL}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        voice,
        input: text,
        format: "mp3",
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return NextResponse.json({ ok: false, error: `TTS failed: ${res.status} ${t}` }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
