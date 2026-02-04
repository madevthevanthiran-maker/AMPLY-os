// lib/assistant/coach.ts
// Coach layer for AMPlyAI OS.
// Purpose: turn raw engine outputs or user intent into
// - concrete next steps
// - suggested actions
// - success criteria
//
// This is where AMPlyAI stops being “informative” and starts being useful.

import type { Action } from "@/lib/actions/types";

export type CoachPriority = "now" | "next" | "later";

export type CoachStep = {
  priority: CoachPriority;
  title: string;
  durationMin?: number;
  successCheck: string;
};

export type CoachOutput = {
  steps: CoachStep[];
  actions: Action[];
};

function mkId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/**
 * Coach for PLAN engine results
 * Assumes engine output contains some notion of tasks / structure
 */
export function coachFromPlan(
  engineOutput: any
): CoachOutput {
  const steps: CoachStep[] = [];
  const actions: Action[] = [];

  // Heuristic: if plan has tasks, push execution
  const tasks =
    engineOutput?.tasks ??
    engineOutput?.items ??
    engineOutput?.checklist ??
    [];

  if (Array.isArray(tasks) && tasks.length > 0) {
    steps.push({
      priority: "now",
      title: "Start executing the plan",
      durationMin: 25,
      successCheck: "Complete at least one planned task",
    });

    actions.push({
      id: mkId("act"),
      type: "start_focus_block",
      label: "Start 25-min focus block",
      trust: "confirm",
      priority: "high",
      reason: "Execution beats planning. Always.",
      payload: {
        title: "Plan Execution",
        durationMin: 25,
        breakMin: 5,
        mode: "pomodoro",
      },
      createdAt: new Date().toISOString(),
    });
  } else {
    steps.push({
      priority: "next",
      title: "Refine or clarify your plan",
      successCheck: "Plan has concrete next steps",
    });
  }

  return { steps, actions };
}

/**
 * Coach for WORKOUT engine results
 */
export function coachFromWorkout(
  engineOutput: any
): CoachOutput {
  const steps: CoachStep[] = [];
  const actions: Action[] = [];

  const title =
    engineOutput?.title ??
    engineOutput?.name ??
    "Workout Session";

  steps.push({
    priority: "now",
    title: `Do the workout: ${title}`,
    durationMin: engineOutput?.durationMin ?? 45,
    successCheck: "Complete at least 70% of prescribed work",
  });

  actions.push({
    id: mkId("act"),
    type: "log_workout",
    label: "Log workout after completion",
    trust: "confirm",
    priority: "normal",
    reason: "Logging improves future recommendations.",
    payload: {
      title,
      durationMin: engineOutput?.durationMin,
      notes: engineOutput?.notes,
    },
    createdAt: new Date().toISOString(),
  });

  return { steps, actions };
}

/**
 * Coach for SUMMARY engine results
 */
export function coachFromSummary(
  engineOutput: any
): CoachOutput {
  const steps: CoachStep[] = [];
  const actions: Action[] = [];

  steps.push({
    priority: "next",
    title: "Review your progress",
    successCheck: "You understand what worked and what didn’t",
  });

  // Optional nudge to plan next block
  actions.push({
    id: mkId("act"),
    type: "open_view",
    label: "Open planner",
    trust: "auto",
    priority: "low",
    payload: {
      view: "plan",
    },
    createdAt: new Date().toISOString(),
  });

  return { steps, actions };
}

/**
 * Coach for NO engine path (direct intent or fallback)
 */
export function coachFromDirect(
  seedActions: Action[] = []
): CoachOutput {
  const steps: CoachStep[] = [];
  const actions: Action[] = [...seedActions];

  if (seedActions.length > 0) {
    steps.push({
      priority: "now",
      title: "Take the suggested action",
      successCheck: "Action executed successfully",
    });
  } else {
    steps.push({
      priority: "next",
      title: "Clarify what you want to do",
      successCheck: "A concrete task or goal is defined",
    });
  }

  return { steps, actions };
}
