// src/lib/assistant/orchestrator.ts
// AMPlyAI Assistant Orchestrator (Brain v1 – Jarvis Mode)
//
// - Deterministic routing (router.ts)
// - Direct engine execution (no fetch)
// - Guaranteed action emission for focus intent
// - trust: "auto" for internal focus actions

import { runEngine } from "@/lib/engines";
import { routeUserMessage } from "@/lib/assistant/router";
import {
  coachFromDirect,
  coachFromPlan,
  coachFromSummary,
  coachFromWorkout,
  type CoachStep,
} from "@/lib/assistant/coach";
import type { EngineName, RouteDecision } from "@/lib/assistant/router";
import type { Action } from "@/lib/actions/types";
import { registerInternalActionExecutors } from "@/lib/actions/executors/internal";

// register executors once
registerInternalActionExecutors();

/* ================= TYPES ================= */

export type AssistantRequest = {
  message: string;
  mode?: string;
};

export type ToolCallRecord = {
  tool: "engine";
  engine: EngineName;
  mode: string;
  goal: string;
  output: unknown;
};

export type MemoryWrite = {
  type: "goal" | "preference" | "fact";
  key: string;
  value: string;
};

export type AssistantResponse = {
  assistant: {
    text: string;
    tone?: "coach" | "neutral";
  };
  toolCalls: ToolCallRecord[];
  actions: Action[];
  coachSteps: CoachStep[];
  memoryWrites: MemoryWrite[];
  debug?: {
    route: RouteDecision;
  };
};

/* ================= HELPERS ================= */

function safeString(x: unknown, fallback = "") {
  return typeof x === "string" ? x : fallback;
}

function deriveGoal(message: string): string {
  const t = message.trim();
  if (!t) return "";
  const explicit = t.match(/\bgoal\s*:\s*(.+)$/i);
  return explicit?.[1]?.trim() ?? t;
}

async function callEngine(engine: EngineName, mode: string, goal: string) {
  return runEngine(engine as any, mode as any, goal);
}

function coachForEngine(engine: EngineName, output: any) {
  if (engine === "plan") return coachFromPlan(output);
  if (engine === "workout") return coachFromWorkout(output);
  if (engine === "summary") return coachFromSummary(output);
  return coachFromDirect();
}

/* ================= FOCUS LOGIC ================= */

function isFocusIntent(message: string, route: RouteDecision): boolean {
  const tags = (route as any)?.tags as string[] | undefined;
  if (Array.isArray(tags) && tags.includes("focus")) return true;

  const t = message.toLowerCase();
  return (
    t.includes("pomodoro") ||
    t.includes("focus block") ||
    t.includes("start focus") ||
    (t.includes("focus") && (t.includes("min") || t.includes("minutes"))) ||
    t.includes("study for")
  );
}

function parseDurationMin(message: string): number {
  const m = message.match(/\b(\d{1,3})\s*(min|minutes)\b/i);
  const n = m?.[1] ? Number(m[1]) : 25;
  if (!Number.isFinite(n) || n <= 0) return 25;
  return Math.max(5, Math.min(180, n));
}

function makeAutoFocusAction(message: string): Action {
  const durationMin = parseDurationMin(message);
  const breakMin = durationMin >= 20 ? 5 : 2;

  return {
    id: `act_focus_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type: "start_focus_block",
    label: `Start ${durationMin}-min focus`,
    trust: "auto", // 🔥 JARVIS MODE
    priority: "high",
    reason: "You asked to focus. Executing immediately.",
    payload: {
      title: "Focus Block",
      durationMin,
      breakMin,
      mode: "pomodoro",
    },
    createdAt: new Date().toISOString(),
  };
}

/* ================= MAIN ================= */

export async function runAssistant(req: AssistantRequest): Promise<AssistantResponse> {
  const message = safeString(req.message);
  const mode = safeString(req.mode, "student");

  const route = routeUserMessage(message);

  const toolCalls: ToolCallRecord[] = [];
  const memoryWrites: MemoryWrite[] = [];

  const actions: Action[] = [];

  // 🔥 GUARANTEED FOCUS ACTION
  if (isFocusIntent(message, route)) {
    actions.push(makeAutoFocusAction(message));
  }

  // NO ENGINE
  if (route.engine === "none") {
    const coached = coachFromDirect(actions);

    return {
      assistant: {
        text: actions.length
          ? "Starting your focus block now."
          : "Tell me what you want to do next.",
        tone: "neutral",
      },
      toolCalls,
      actions: coached.actions,
      coachSteps: coached.steps,
      memoryWrites,
      debug: { route },
    };
  }

  // ENGINE PATH
  const engine = route.engine;
  const goal = deriveGoal(message);

  const output = await callEngine(engine, mode, goal);

  toolCalls.push({
    tool: "engine",
    engine,
    mode,
    goal,
    output,
  });

  const coached = coachForEngine(engine, output);

  return {
    assistant: {
      text:
        engine === "plan"
          ? "Plan ready. Starting focus."
          : engine === "workout"
          ? "Workout ready. Let’s go."
          : "Summary ready.",
      tone: "coach",
    },
    toolCalls,
    actions: [...actions, ...coached.actions],
    coachSteps: coached.steps,
    memoryWrites,
    debug: { route },
  };
}
