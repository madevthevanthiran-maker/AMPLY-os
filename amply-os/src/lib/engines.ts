// src/lib/engines.ts

import type {
  CoachBlock,
  CoachStep,
  EngineName,
  EngineResponse,
  Mode,
  Priority,
} from "./engineTypes";

import type { Action } from "@/lib/actions/types";

function clampGoal(goal: string): string {
  const g = (goal ?? "").trim();
  return g.length > 0 ? g : "make progress";
}

function makeCoach(goal: string, priority: Priority, steps: CoachStep[]): CoachBlock {
  return {
    goal,
    priority,
    steps,
  };
}

function generatePlan(mode: Mode, goalInput: string): EngineResponse {
  const goal = clampGoal(goalInput);

  const items =
    mode === "freelancer"
      ? [
          `Define success: what does "${goal}" mean in $$ or deliverables?`,
          "List 3 highest-impact tasks (client / portfolio / outreach).",
          "Do 25 min deep work (one task).",
          "Ship something visible (draft, post, pitch, update).",
          "Repeat: 25 min focus + 5 min break x2.",
          "End: write the next tiny step and schedule it.",
        ]
      : mode === "creator"
      ? [
          `Define success: what does "${goal}" look like (views, uploads, revenue)?`,
          "Pick ONE piece to publish this week (video/post/thread).",
          "Outline in 10 mins (hook → points → CTA).",
          "Create 25 mins focused (no perfection cosplay).",
          "Publish or schedule (yes, even if it's mid).",
          "End: write next session’s first step.",
        ]
      : [
          `Define success: what does "${goal}" mean in 1 measurable sentence?`,
          "List 3 weak topics (from syllabus / past mistakes).",
          "Do 25 min active recall (no notes), then check answers.",
          "Fix mistakes: write 3 bullets on why you got them wrong.",
          "Repeat: 25 min focus + 5 min break x2.",
          "End: write next session’s first task (so future-you can’t dodge).",
        ];

  const coach = makeCoach(goal, "high", [
    {
      id: "define",
      title: "Turn the goal into a number you can chase",
      durationMins: 5,
      successCheck: "You wrote 1 measurable sentence",
      nextIfStuck: "Use: By (date), I will (metric).",
      checklist: ["1 measurable sentence", "deadline/date"],
    },
    {
      id: "execute",
      title: "One focused block (Pomodoro)",
      durationMins: 25,
      successCheck: "25 mins done, no distractions",
      checklist: ["timer running", "notifications off"],
    },
  ]);

  return {
    ok: true,
    engine: "plan",
    mode,
    goal,
    items,
    coach,
  };
}

function generateWorkout(mode: Mode, goalInput: string): EngineResponse & {
  actions?: Action[];
} {
  const goal = clampGoal(goalInput);

  const items =
    mode === "creator"
      ? [
          "5 min warm-up (mobility + light cardio)",
          "Push-ups: 3 sets (leave 2 reps in tank)",
          "Rows (band/dumbbell): 3 sets",
          "Overhead press (DB/bar): 3 sets",
          "Plank: 2 x 45s",
          "Cool down + stretch 5 min",
        ]
      : [
          "5 min warm-up (jumping jacks / brisk walk)",
          "Push-ups: 3 sets (stop 2 reps before failure)",
          "Rows (band/dumbbell): 3 sets",
          "Squats: 3 sets",
          "Plank: 2 x 45s",
          "Cool down + stretch 5 min",
        ];

  const coach = makeCoach(goal, "medium", [
    {
      id: "intent",
      title: "Decide today’s training intent",
      durationMins: 2,
      successCheck: "You chose strength / hypertrophy / conditioning",
      checklist: ["intent chosen", "rep range picked"],
    },
    {
      id: "execute",
      title: "Run the workout",
      durationMins: 45,
      successCheck: "Workout completed or honestly attempted",
    },
  ]);

  const actions: Action[] = [
    {
      id: `start_workout_${Date.now()}`,
      type: "start_focus_block",
      label: "Start workout (45 min)",
      trust: "confirm",
      priority: "high",
      reason: "Best workout is the one you actually start.",
      payload: {
        title: "Workout Session",
        durationMin: 45,
        mode: "deep",
      },
      createdAt: new Date().toISOString(),
    },
    {
      id: `log_workout_${Date.now()}`,
      type: "log_workout",
      label: "Log workout",
      trust: "confirm",
      priority: "normal",
      reason: "Logging improves future programming.",
      payload: {
        title: "Workout Session",
        durationMin: 45,
      },
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    ok: true,
    engine: "workout",
    mode,
    goal,
    items,
    coach,
    actions,
  };
}

function generateSummary(mode: Mode, goalInput: string): EngineResponse {
  const goal = clampGoal(goalInput);

  const items = [
    `Mode: ${mode}`,
    `Main goal: ${goal}`,
    "Next best action: pick 1 task and do 25 minutes focused",
    "Rule: one tab, notifications off",
  ];

  const coach = makeCoach(goal, "low", [
    {
      id: "one-thing",
      title: "Choose the ONE thing",
      durationMins: 2,
      successCheck: "You can say the next action in 7 words",
      checklist: ["single action"],
    },
  ]);

  return {
    ok: true,
    engine: "summary",
    mode,
    goal,
    items,
    coach,
  };
}

export function runEngine(engine: EngineName, mode: Mode, goal: string): EngineResponse {
  if (engine === "plan") return generatePlan(mode, goal);
  if (engine === "workout") return generateWorkout(mode, goal);
  return generateSummary(mode, goal);
}
