// src/app/api/actions/execute/route.ts

import { NextResponse } from "next/server";
import type { Action, ActionExecutionContext } from "@/lib/actions/types";
import { executeAction } from "@/lib/actions/execute";
import { registerInternalActionExecutors } from "@/lib/actions/executors/internal";

// Ensure internal executors are registered in this runtime too
registerInternalActionExecutors();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<{
      action: Action;
      ctx: ActionExecutionContext;
    }>;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing request body" },
        { status: 400 }
      );
    }

    const action = body.action;
    if (!action || typeof action !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing action" },
        { status: 400 }
      );
    }

    const ctx: ActionExecutionContext = body.ctx ?? {};
    const result = await executeAction(action, ctx);

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
