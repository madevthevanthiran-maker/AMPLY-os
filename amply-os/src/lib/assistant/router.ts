// lib/assistant/router.ts
// Lightweight intent routing for AMPlyAI OS.
// Purpose: decide which tool(s) to call + which native actions to suggest,
// without pulling in model dependencies yet.
// This is deterministic + extendable.

import type { Action } from "@/lib/actions/types";

export type EngineName = "plan" | "workout" | "summary" | "none";

export type RouteDecision = {
  engine: EngineName;
  // Optional “assistant-first” reply when no engine call is needed
  directText?: string;
  // Hints for orchestrator (e.g., call multiple engines later)
  tags?: string[];
  // Optional starter actions even before engine output
  seedActions?: Action[];
  // Confidence-ish signal for UI/debugging (not used for auth)
  confidence: "low" | "medium" | "high";
};

function mkId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Very simple heuristic routing:
 * - “plan / schedule / study / project / checklist” -> plan
 * - “workout / gym / training / sets / reps / rpe” -> workout
 * - “summarize / recap / what did i do / progress” -> summary
 * - “start focus / pomodoro / lock in” -> none + focus action
 */
export function routeUserMessage(message: string): RouteDecision {
  const t = norm(message);

  // Empty / nonsense
  if (!t) {
    return {
      engine: "none",
      directText: "Say something and I’ll do something. Preferably in that order.",
      confidence: "high",
    };
  }

  // Focus triggers (native action)
  const focusHit =
    /\b(focus|pomodoro|lock\s*in|deep\s*work|start\s*(a\s*)?timer|study\s*block)\b/.test(
      t
    );

  if (focusHit) {
    // default: 25 unless user specifies (we’ll parse better later)
    const durMatch = t.match(/\b(\d{1,3})\s*(min|mins|minute|minutes)\b/);
    const durationMin = durMatch ? Math.max(1, Number(durMatch[1])) : 25;

    const seedActions: Action[] = [
      {
        id: mkId("act"),
        type: "start_focus_block",
        label: `Start ${durationMin}-min focus`,
        trust: "confirm",
        priority: "high",
        reason: "You asked to focus. I am nothing if not obedient.",
        payload: {
          title: "Focus Block",
          durationMin,
          breakMin: 5,
          mode: "pomodoro",
        },
        createdAt: new Date().toISOString(),
      },
    ];

    // Sometimes focus is part of planning; but keep it “none” unless plan keywords appear strongly
    const planish = /\b(plan|schedule|checklist|tasks?|today|tomorrow)\b/.test(t);
    return {
      engine: planish ? "plan" : "none",
      seedActions,
      confidence: "high",
      tags: ["focus"],
    };
  }

  // Summary intent
  const summaryHit =
    /\b(summar(y|ise)|recap|what\s+did\s+i\s+do|my\s+progress|overview|log)\b/.test(t);

  if (summaryHit) {
    return {
      engine: "summary",
      confidence: "high",
      tags: ["summary"],
    };
  }

  // Workout intent
  const workoutHit =
    /\b(work\s*out|workout|gym|train(ing)?|lift|sets?|reps?|rpe|hypertrophy|strength|cardio|cut|bulk)\b/.test(
      t
    );

  if (workoutHit) {
    return {
      engine: "workout",
      confidence: "high",
      tags: ["workout"],
    };
  }

  // Planning intent
  const planHit =
    /\b(plan|schedule|calendar|checklist|to-?do|tasks?|roadmap|strategy|study|revision|deadline|project)\b/.test(
      t
    );

  if (planHit) {
    return {
      engine: "plan",
      confidence: "high",
      tags: ["plan"],
    };
  }

  // Default: no engine, just a direct nudge (or later: model chat)
  return {
    engine: "none",
    confidence: "medium",
    directText:
      "I can plan, coach workouts, or summarize your progress. Tell me what you want done, not what you want *discussed*.",
    tags: ["fallback"],
  };
}
