// lib/actions/types.ts
// Action system contracts for AMPlyAI OS
// - Pure types/interfaces: safe, dependency-free, future-proof
// - Designed to support Tier 1 → Tier 5 integrations without rewrites

export type ActionPriority = "low" | "normal" | "high";
export type ActionTrustLevel = "confirm" | "auto";

/**
 * Expand this list freely. The key rule:
 * - ActionType is stable (string union)
 * - Payloads are strongly typed via ActionPayloadMap
 */
export type ActionType =
  // Internal / core OS
  | "start_focus_block"
  | "end_focus_block"
  | "create_checklist"
  | "create_task"
  | "complete_task"
  | "open_view"
  | "set_goal"
  | "set_preference"
  | "log_event" // generic internal timeline event
  // Workout
  | "log_workout"
  | "adjust_workout"
  // Calendar / Email (future executors)
  | "schedule_event"
  | "update_event"
  | "cancel_event"
  | "draft_email"
  | "send_email"
  // Automation bridges (Tier 5)
  | "trigger_webhook"
  | "run_automation";

/**
 * Payloads per action type. Keep these minimal and composable.
 * Any integration-specific fields should go inside `meta`.
 */
export type ActionPayloadMap = {
  // Focus
  start_focus_block: {
    title: string;
    durationMin: number; // e.g. 25
    breakMin?: number; // e.g. 5
    mode?: "pomodoro" | "deep" | "sprint";
    meta?: Record<string, unknown>;
  };
  end_focus_block: {
    focusBlockId?: string;
    outcome?: "completed" | "stopped_early" | "skipped";
    notes?: string;
    meta?: Record<string, unknown>;
  };

  // Checklist / Tasks
  create_checklist: {
    title: string;
    items: Array<{
      text: string;
      done?: boolean;
      estimateMin?: number;
    }>;
    meta?: Record<string, unknown>;
  };
  create_task: {
    title: string;
    dueAt?: string; // ISO datetime
    estimateMin?: number;
    tags?: string[];
    meta?: Record<string, unknown>;
  };
  complete_task: {
    taskId: string;
    meta?: Record<string, unknown>;
  };

  // Navigation / UI
  open_view: {
    view:
      | "chat"
      | "plan"
      | "workout"
      | "summary"
      | "focus"
      | "timeline"
      | "settings";
    params?: Record<string, string>;
    meta?: Record<string, unknown>;
  };

  // Memory writes (internal brain memory)
  set_goal: {
    key: string; // e.g. "fitness.goal"
    value: string; // e.g. "gain to 60kg"
    meta?: Record<string, unknown>;
  };
  set_preference: {
    key: string; // e.g. "workout.equipmentPreference"
    value: string; // e.g. "alternate_barbell_dumbbell"
    meta?: Record<string, unknown>;
  };

  // Internal timeline event
  log_event: {
    kind: string; // e.g. "workout_session", "study_block", "reflection"
    title: string;
    details?: Record<string, unknown>;
    happenedAt?: string; // ISO datetime
    meta?: Record<string, unknown>;
  };

  // Workout
  log_workout: {
    workoutId?: string;
    title: string;
    durationMin?: number;
    rpe?: number; // 1-10
    notes?: string;
    meta?: Record<string, unknown>;
  };
  adjust_workout: {
    workoutId?: string;
    intensity?: "low" | "moderate" | "high";
    focus?: Array<"strength" | "hypertrophy" | "conditioning" | "mobility">;
    constraints?: string[]; // e.g. ["no_lunges_space", "fatigued"]
    meta?: Record<string, unknown>;
  };

  // Calendar (Google/Outlook/etc)
  schedule_event: {
    title: string;
    startAt: string; // ISO datetime
    endAt: string; // ISO datetime
    location?: string;
    description?: string;
    attendees?: string[];
    calendarProvider?: "google" | "outlook" | "internal";
    meta?: Record<string, unknown>;
  };
  update_event: {
    eventId: string;
    calendarProvider?: "google" | "outlook" | "internal";
    patch: Partial<{
      title: string;
      startAt: string;
      endAt: string;
      location: string;
      description: string;
      attendees: string[];
    }>;
    meta?: Record<string, unknown>;
  };
  cancel_event: {
    eventId: string;
    calendarProvider?: "google" | "outlook" | "internal";
    reason?: string;
    meta?: Record<string, unknown>;
  };

  // Email
  draft_email: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    provider?: "gmail" | "outlook" | "internal";
    meta?: Record<string, unknown>;
  };
  send_email: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    bodyText: string;
    bodyHtml?: string;
    provider?: "gmail" | "outlook" | "internal";
    // If drafted previously:
    draftId?: string;
    meta?: Record<string, unknown>;
  };

  // Automation bridges
  trigger_webhook: {
    url: string;
    method?: "POST" | "PUT" | "PATCH";
    headers?: Record<string, string>;
    body?: unknown;
    meta?: Record<string, unknown>;
  };
  run_automation: {
    provider: "zapier" | "make" | "n8n" | "custom";
    workflowId?: string; // if known
    name?: string; // friendly name
    input?: Record<string, unknown>;
    meta?: Record<string, unknown>;
  };
};

/**
 * A single action emitted by the assistant brain.
 * - `trust`: whether it can run automatically or needs user confirmation
 * - `reason`: short explanation for UI
 */
export type Action<T extends ActionType = ActionType> = {
  id: string; // unique per action instance
  type: T;
  priority?: ActionPriority;
  trust?: ActionTrustLevel;
  label: string; // UI button text e.g. "Start 25-min focus"
  reason?: string; // short rationale
  payload: ActionPayloadMap[T];
  createdAt?: string; // ISO
};

/**
 * Standard executor result.
 * Keep it consistent so Coach can reason about success/failure.
 */
export type ActionResult = {
  ok: boolean;
  actionId: string;
  type: ActionType;
  message?: string; // human-readable outcome
  data?: unknown; // structured output (e.g. eventId, draftId, created objects)
  error?: {
    code: string;
    detail?: string;
  };
  executedAt: string; // ISO
};

/**
 * Execution context passed to executors (kept generic for now).
 * Later you’ll add userId, session, tokens, prisma client, etc.
 */
export type ActionExecutionContext = {
  userId?: string;
  nowIso?: string;
  // reserved: integration tokens, prisma, request metadata, etc.
  meta?: Record<string, unknown>;
};
