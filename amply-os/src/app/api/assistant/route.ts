// src/app/api/assistant/route.ts

import { NextResponse } from "next/server";
import { runAssistant } from "@/lib/assistant/orchestrator";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      message: string;
      mode: string;
    }>;

    const message = typeof body.message === "string" ? body.message : "";
    const mode = typeof body.mode === "string" ? body.mode : "student";

    const result = await runAssistant({ message, mode });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
