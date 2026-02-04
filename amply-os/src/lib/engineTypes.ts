// src/lib/engineTypes.ts

export type Mode = "student" | "freelancer" | "creator";
export type EngineName = "plan" | "workout" | "summary";

export type Priority = "low" | "medium" | "high";

export type CoachStep = {
  id: string;
  title: string;
  durationMins?: number;
  why?: string;
  successCheck?: string;
  nextIfStuck?: string;
  checklist?: string[];
};

export type CoachBlock = {
  goal: string;
  priority: Priority;
  steps: CoachStep[];
};

export type EngineResponse = {
  ok: boolean;
  engine: EngineName;
  mode: Mode;
  goal: string;

  // Primary list your UI can always render
  items: string[];

  // Optional "make it smarter" block
  coach?: CoachBlock;

  // Optional debug helpers
  raw?: unknown;
  error?: string;
};

export function isEngineName(x: unknown): x is EngineName {
  return x === "plan" || x === "workout" || x === "summary";
}

export function isMode(x: unknown): x is Mode {
  return x === "student" || x === "freelancer" || x === "creator";
}

/**
 * Your UI can use this as the "default list to show"
 * (keeps ResultView simple).
 */
export function getPrimaryList(res: EngineResponse): string[] {
  return res.items ?? [];
}
