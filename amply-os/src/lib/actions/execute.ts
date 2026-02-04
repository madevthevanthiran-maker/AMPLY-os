// lib/actions/execute.ts
// Safe execution wrapper for AMPlyAI actions.
// - Validates actions (if executor provides validate)
// - Never throws (returns ok=false ActionResult instead)
// - Standardizes execution context

import type { Action, ActionExecutionContext, ActionResult } from "./types";
import { getActionExecutor } from "./registry";

function fail(action: Action, code: string, detail?: string): ActionResult {
  return {
    ok: false,
    actionId: action.id,
    type: action.type,
    executedAt: new Date().toISOString(),
    error: { code, detail },
    message: detail,
  };
}

export async function executeAction(
  action: Action,
  ctx: ActionExecutionContext = {}
): Promise<ActionResult> {
  const executor = getActionExecutor(action.type);

  if (!executor) {
    return fail(action, "NO_EXECUTOR", `No executor registered for ${action.type}`);
  }

  // Validate (cheap, optional)
  try {
    if (executor.validate) {
      const problem = executor.validate(action as any);
      if (problem) return fail(action, "VALIDATION_ERROR", problem);
    }
  } catch (e: any) {
    return fail(action, "VALIDATION_CRASH", e?.message ?? "Validation failed");
  }

  // Execute (must never throw, but we enforce anyway)
  try {
    const nowIso = ctx.nowIso ?? new Date().toISOString();
    const mergedCtx: ActionExecutionContext = {
      ...ctx,
      nowIso,
    };

    const res = await executor.execute(action as any, mergedCtx);

    // Ensure minimal correctness even if an executor is sloppy
    return {
      ok: Boolean(res.ok),
      actionId: res.actionId ?? action.id,
      type: res.type ?? action.type,
      executedAt: res.executedAt ?? nowIso,
      message: res.message,
      data: res.data,
      error: res.error,
    };
  } catch (e: any) {
    return fail(
      action,
      "EXECUTION_CRASH",
      e?.message ?? "Executor crashed"
    );
  }
}
