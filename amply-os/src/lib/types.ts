export type Mode = "student" | "freelancer" | "creator";
export type Engine = "plan" | "workout" | "summary";

export type EngineResponse = {
  ok: boolean;
  engine: Engine;
  mode: Mode;
  goal: string;
  items: string[];
};
