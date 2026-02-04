// src/components/ResultView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { EngineResponse, CoachStep as EngineCoachStep } from "@/lib/engineTypes";
import { getPrimaryList } from "@/lib/engineTypes";
import type { Action, ActionResult } from "@/lib/actions/types";
import { decideTrust } from "@/lib/actions/trust";

type AssistantCoachStep = {
  priority: "now" | "next" | "later";
  title: string;
  durationMin?: number;
  successCheck: string;
};

type AssistantResponse = {
  assistant?: { text: string; tone?: "coach" | "neutral" };
  toolCalls?: unknown[];
  actions?: Action[];
  coachSteps?: AssistantCoachStep[];
  memoryWrites?: unknown[];
  debug?: unknown;
};

type Props = {
  data: EngineResponse | AssistantResponse | null;
  loading?: boolean;
};

function isAssistantResponse(x: EngineResponse | AssistantResponse): x is AssistantResponse {
  return (
    typeof x === "object" &&
    x !== null &&
    ("assistant" in x || "actions" in x || "coachSteps" in x || "toolCalls" in x)
  );
}

export default function ResultView({ data, loading = false }: Props) {
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const [autoRan, setAutoRan] = useState<Record<string, true>>({});

  const mode = useMemo(() => {
    if (!data) return "none";
    return isAssistantResponse(data) ? "assistant" : "engine";
  }, [data]);

  async function runAction(action: Action) {
    try {
      setRunningActionId(action.id);

      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = (await res.json()) as ActionResult;

      setActionResults((prev) => ({
        ...prev,
        [action.id]: json,
      }));
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : "Unknown error";
      const fallback: ActionResult = {
        ok: false,
        actionId: action.id,
        type: action.type,
        executedAt: new Date().toISOString(),
        message: "Failed to execute action",
        error: { code: "CLIENT_ERROR", detail },
      };

      setActionResults((prev) => ({
        ...prev,
        [action.id]: fallback,
      }));
    } finally {
      setRunningActionId(null);
    }
  }

  // Auto-run safe actions (once per action.id)
  useEffect(() => {
    if (mode !== "assistant") return;
    const assistantData = data as AssistantResponse;
    const actions: Action[] = Array.isArray(assistantData.actions) ? assistantData.actions : [];
    if (!actions.length) return;

    for (const a of actions) {
      if (autoRan[a.id]) continue;
      if (actionResults[a.id]) continue;
      if (runningActionId) continue; // keep it simple: one at a time

      const decision = decideTrust(a);
      if (!decision.shouldAutoRun) continue;

      // mark as auto-ran first to prevent loops
      setAutoRan((prev) => ({ ...prev, [a.id]: true }));

      // run it
      void runAction(a);
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, data, autoRan, actionResults, runningActionId]);

  if (loading) {
    return <div className="text-xs text-zinc-400">Thinking…</div>;
  }

  if (!data) {
    return <div className="text-xs text-zinc-500">Hit one of the buttons to see the result.</div>;
  }

  // ---------- ASSISTANT RESPONSE RENDER ----------
  if (mode === "assistant") {
    const assistantData = data as AssistantResponse;

    const actions: Action[] = Array.isArray(assistantData.actions) ? assistantData.actions : [];
    const coachSteps: AssistantCoachStep[] = Array.isArray(assistantData.coachSteps)
      ? assistantData.coachSteps
      : [];

    return (
      <div className="space-y-3">
        {/* Assistant message */}
        {assistantData.assistant?.text ? (
          <div className="rounded-md border border-zinc-800 bg-black/30 px-3 py-2 text-sm">
            {assistantData.assistant.text}
          </div>
        ) : null}

        {/* Actions */}
        {actions.length > 0 ? (
          <div className="rounded-md border border-zinc-800 bg-black/20 p-3">
            <div className="mb-2 text-sm font-semibold">Actions</div>

            <div className="space-y-2">
              {actions.map((a: Action) => {
                const isRunning = runningActionId === a.id;
                const r = actionResults[a.id];
                const trust = decideTrust(a);
                const isAuto = trust.shouldAutoRun;

                return (
                  <div key={a.id} className="rounded-md border border-zinc-800 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{a.label}</div>
                        {a.reason ? (
                          <div className="mt-1 text-xs text-zinc-400">{a.reason}</div>
                        ) : null}
                        <div className="mt-1 text-[11px] text-zinc-500">
                          {a.type}
                          {a.trust ? ` • ${a.trust}` : ""}
                          {a.priority ? ` • ${a.priority}` : ""}
                          {isAuto ? " • auto" : ""}
                        </div>
                      </div>

                      <button
                        onClick={() => runAction(a)}
                        disabled={isRunning}
                        className="shrink-0 rounded-md border border-zinc-700 bg-black/40 px-3 py-1.5 text-xs text-zinc-200 hover:bg-black/60 disabled:opacity-50"
                      >
                        {isRunning ? "Running…" : "Run"}
                      </button>
                    </div>

                    {/* Result */}
                    {r ? (
                      <div className="mt-3 rounded-md border border-zinc-800 bg-black/20 p-2 text-xs">
                        <div className={r.ok ? "text-emerald-300" : "text-rose-300"}>
                          {r.ok ? "✅ " : "❌ "}
                          {r.message ?? (r.ok ? "Done" : "Failed")}
                        </div>
                        {r.error?.detail ? (
                          <div className="mt-1 text-zinc-400">{r.error.detail}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Coach Steps */}
        {coachSteps.length > 0 ? (
          <div className="rounded-md border border-zinc-800 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Coach</div>
              <div className="text-xs text-zinc-400">Assistant</div>
            </div>

            <div className="space-y-2">
              {coachSteps.map((s: AssistantCoachStep, idx: number) => (
                <div
                  key={`${s.priority}-${idx}`}
                  className="rounded-md border border-zinc-800 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      [{s.priority}] {s.title}
                    </div>
                    {typeof s.durationMin === "number" ? (
                      <div className="text-xs text-zinc-400">{s.durationMin}m</div>
                    ) : null}
                  </div>

                  <div className="mt-2 text-xs">
                    <span className="text-zinc-400">Success:</span> {s.successCheck}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Raw JSON */}
        <details className="rounded-md border border-zinc-800 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs text-zinc-400">Raw JSON</summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">
            {JSON.stringify(assistantData, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  // ---------- ENGINE RESPONSE RENDER (UNCHANGED) ----------
  const engineData = data as EngineResponse;
  const list = getPrimaryList(engineData);

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-400">Engine: {engineData.engine}</div>

      <div className="space-y-2">
        {list.map((item: string, i: number) => (
          <div
            key={`${engineData.engine}-${i}`}
            className="rounded-md border border-zinc-800 bg-black/30 px-3 py-2 text-sm"
          >
            {item}
          </div>
        ))}
      </div>

      {engineData.coach ? (
        <div className="rounded-md border border-zinc-800 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">Coach</div>
            <div className="text-xs text-zinc-400">Priority: {engineData.coach.priority}</div>
          </div>

          <div className="space-y-2">
            {engineData.coach.steps.map((s: EngineCoachStep) => (
              <div key={s.id} className="rounded-md border border-zinc-800 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{s.title}</div>
                  {typeof s.durationMins === "number" ? (
                    <div className="text-xs text-zinc-400">{s.durationMins}m</div>
                  ) : null}
                </div>

                {s.why ? <div className="mt-1 text-xs text-zinc-400">{s.why}</div> : null}

                {s.successCheck ? (
                  <div className="mt-2 text-xs">
                    <span className="text-zinc-400">Success:</span> {s.successCheck}
                  </div>
                ) : null}

                {s.nextIfStuck ? (
                  <div className="mt-1 text-xs">
                    <span className="text-zinc-400">If stuck:</span> {s.nextIfStuck}
                  </div>
                ) : null}

                {Array.isArray(s.checklist) && s.checklist.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-xs text-zinc-300">
                    {s.checklist.map((x: string, idx: number) => (
                      <li key={`${s.id}-c-${idx}`}>{x}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <details className="rounded-md border border-zinc-800 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs text-zinc-400">Raw JSON</summary>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">
          {JSON.stringify(engineData, null, 2)}
        </pre>
      </details>
    </div>
  );
}
