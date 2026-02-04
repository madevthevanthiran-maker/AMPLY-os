// lib/actions/executors/internal.ts
// Internal (first-party) action executors for AMPlyAI OS.
// These do NOT depend on external services.
// Safe to run automatically once trust levels allow.

import {
  Action,
  ActionExecutionContext,
  ActionResult,
} from "../types";
import { ActionExecutor, registerActionExecutors } from "../registry";

/**
 * Utility: build a standard ActionResult
 */
function result(
  action: Action,
  ok: boolean,
  message?: string,
  data?: unknown,
  error?: ActionResult["error"]
): ActionResult {
  return {
    ok,
    actionId: action.id,
    type: action.type,
    message,
    data,
    error,
    executedAt: new Date().toISOString(),
  };
}

/**
 * start_focus_block
 * For now, this is a logical start (no timers yet).
 * Later this will:
 * - create a FocusBlock DB record
 * - trigger timers / notifications
 */
const startFocusBlockExecutor: ActionExecutor<"start_focus_block"> = {
  type: "start_focus_block",
  validate(action) {
    const { title, durationMin } = action.payload;
    if (!title) return "Focus block title is required";
    if (!durationMin || durationMin <= 0)
      return "durationMin must be > 0";
    return null;
  },
  async execute(action, ctx: ActionExecutionContext) {
    const { title, durationMin, breakMin, mode } = action.payload;

    // Placeholder logic (no side effects yet)
    return result(action, true, "Focus block started", {
      title,
      durationMin,
      breakMin: breakMin ?? null,
      mode: mode ?? "pomodoro",
      startedAt: ctx.nowIso ?? new Date().toISOString(),
    });
  },
};

/**
 * create_checklist
 * Purely returns structured checklist data for UI + memory.
 */
const createChecklistExecutor: ActionExecutor<"create_checklist"> = {
  type: "create_checklist",
  validate(action) {
    if (!action.payload.title) return "Checklist title is required";
    if (!action.payload.items?.length)
      return "Checklist must have at least one item";
    return null;
  },
  async execute(action) {
    return result(action, true, "Checklist created", {
      title: action.payload.title,
      items: action.payload.items.map((it, idx) => ({
        id: `item_${idx + 1}`,
        ...it,
        done: it.done ?? false,
      })),
    });
  },
};

/**
 * open_view
 * Signals the UI to navigate.
 * No server-side side effects.
 */
const openViewExecutor: ActionExecutor<"open_view"> = {
  type: "open_view",
  validate(action) {
    if (!action.payload.view) return "View is required";
    return null;
  },
  async execute(action) {
    return result(action, true, "Navigation requested", {
      view: action.payload.view,
      params: action.payload.params ?? {},
    });
  },
};

/**
 * log_workout
 * Stub for now.
 * Later in Step B, this will:
 * - write WorkoutSession to DB
 * - update fatigue / recovery memory
 */
const logWorkoutExecutor: ActionExecutor<"log_workout"> = {
  type: "log_workout",
  validate(action) {
    if (!action.payload.title) return "Workout title is required";
    return null;
  },
  async execute(action, ctx: ActionExecutionContext) {
    return result(action, true, "Workout logged", {
      ...action.payload,
      loggedAt: ctx.nowIso ?? new Date().toISOString(),
    });
  },
};

/**
 * Register all internal executors.
 * This file should be imported ONCE at app startup
 * (e.g. in /api/assistant or a server bootstrap file).
 */
export function registerInternalActionExecutors() {
  registerActionExecutors([
    startFocusBlockExecutor,
    createChecklistExecutor,
    openViewExecutor,
    logWorkoutExecutor,
  ]);
}
