// src/lib/assistant/orchestrator.ts
// AMPlyAI Assistant Orchestrator (Brain v2)

import { runEngine } from "@/lib/engines";
import type { EngineName, RouteDecision } from "@/lib/assistant/router";
import { routeUserMessage } from "@/lib/assistant/router";
import {
  coachFromDirect,
  coachFromPlan,
  coachFromSummary,
  coachFromWorkout,
  type CoachStep,
} from "@/lib/assistant/coach";
import type { Action } from "@/lib/actions/types";
import { registerInternalActionExecutors } from "@/lib/actions/executors/internal";
import { ASSISTANT_NAME } from "@/lib/assistant/constants";
import { chatLLM, type LLMMessage } from "@/lib/assistant/llm";

// Register internal executors once per server runtime.
registerInternalActionExecutors();

export type AssistantRequest = {
  message: string;
  mode?: string;
};

export type ToolCallRecord = {
  tool: "engine" | "llm";
  engine?: EngineName;
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
    name?: string;
  };
  toolCalls: ToolCallRecord[];
  actions: Action[];
  coachSteps: CoachStep[];
  memoryWrites: MemoryWrite[];
  debug?: {
    route: RouteDecision;
  };
};

function safeString(x: unknown, fallback = "") {
  return typeof x === "string" ? x : fallback;
}

function deriveGoal(message: string, engine: EngineName): string {
  const t = message.trim();
  if (!t) return "";

  const explicit = t.match(/\bgoal\s*:\s*(.+)$/i);
  if (explicit?.[1]) return explicit[1].trim();

  return t;
}

async function callEngine(params: {
  engine: EngineName;
  mode: string;
  goal: string;
}): Promise<any> {
  return runEngine(params.engine as any, params.mode as any, params.goal);
}

function coachForEngine(engine: EngineName, output: any) {
  if (engine === "plan") return coachFromPlan(output);
  if (engine === "workout") return coachFromWorkout(output);
  if (engine === "summary") return coachFromSummary(output);
  return coachFromDirect();
}

function systemPrompt(mode: string) {
  return `
You are AMP, the assistant inside AMPLY OS.
Tone: calm operator + sharp co-pilot (50/50). Helpful, concise, not robotic.
Rules:
- If the user asks "what can you do", describe capabilities inside AMPLY OS (calendar, reminders, notifications, memory, planning).
- If the user message is vague, ask ONE clarifying question.
- If the user asks for an outcome, propose a short plan and offer to execute next step.
- Respect remembered preferences (e.g., short answers) when present in context.
`.trim();
}

export async function runAssistant(req: AssistantRequest): Promise<AssistantResponse> {
  const message = safeString(req.message);
  const mode = safeString(req.mode, "student");

  const route = routeUserMessage(message);

  const toolCalls: ToolCallRecord[] = [];
  const memoryWrites: MemoryWrite[] = [];
  const seedActions = route.seedActions ?? [];

  // NO ENGINE PATH -> REAL CHAT (LLM)
  if (route.engine === "none") {
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt(mode) },
      { role: "user", content: message },
    ];

    const llm = await chatLLM(messages);

    toolCalls.push({
      tool: "llm",
      mode,
      goal: "conversational_response",
      output: { ok: llm.ok, text: llm.text },
    });

    const coached = coachFromDirect(seedActions);

    return {
      assistant: {
        name: ASSISTANT_NAME,
        text: llm.text,
        tone: "neutral",
      },
      toolCalls,
      actions: coached.actions,
      coachSteps: coached.steps,
      memoryWrites,
      debug: { route },
    };
  }

  // ENGINE PATH (existing)
  const engine = route.engine;
  const goal = deriveGoal(message, engine);

  const output = await callEngine({ engine, mode, goal });

  toolCalls.push({
    tool: "engine",
    engine,
    mode,
    goal,
    output,
  });

  const coached = coachForEngine(engine, output);
  const actions: Action[] = [...seedActions, ...coached.actions];

  const assistantText =
    engine === "plan"
      ? `${ASSISTANT_NAME} generated your plan. Pick the first task — I’ll push the next step.`
      : engine === "workout"
      ? `${ASSISTANT_NAME} built your workout. Start when you’re ready — log the result after.`
      : `${ASSISTANT_NAME} summarized it. Want me to convert this into next actions?`;

  return {
    assistant: {
      name: ASSISTANT_NAME,
      text: assistantText,
      tone: "coach",
    },
    toolCalls,
    actions,
    coachSteps: coached.steps,
    memoryWrites,
    debug: { route },
  };
}
