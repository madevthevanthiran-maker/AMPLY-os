// src/app/api/engine/route.ts

import { NextResponse } from "next/server";
import { runEngine } from "@/lib/engines";
import { isEngineName, isMode, type EngineName, type Mode } from "@/lib/engineTypes";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      engine: EngineName;
      mode: Mode;
      goal: string;
    }>;

    const engine = isEngineName(body.engine) ? body.engine : "plan";
    const mode = isMode(body.mode) ? body.mode : "student";
    const goal = typeof body.goal === "string" ? body.goal : "";

    const result = runEngine(engine, mode, goal);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        engine: "plan",
        mode: "student",
        goal: "",
        items: [],
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}
