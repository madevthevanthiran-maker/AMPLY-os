// src/components/Dashboard.tsx

"use client";

import { useState } from "react";
import Card from "./Card";
import ModeSelector from "./ModeSelector";
import ResultView from "./ResultView";
import { Mode } from "@/lib/engineTypes";

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>("student");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const goalValid = goal.trim().length > 0;

  async function run(intent: "plan" | "workout" | "summary") {
    if (!goalValid) return;

    setLoading(true);
    setResult(null);

    try {
      // Give the assistant a hint, but still let it decide routing/actions.
      const message = `${intent}: ${goal}`;

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          mode,
        }),
      });

      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({
        assistant: {
          text: "Something exploded. Check terminal + network tab.",
          tone: "neutral",
        },
        actions: [],
        coachSteps: [],
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-6">
      {/* MODE */}
      <Card title="MODE">
        <ModeSelector value={mode} onChange={setMode} />
      </Card>

      {/* GOAL */}
      <Card title="YOUR MAIN GOAL">
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What do you want to accomplish?"
          className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-sm"
          rows={3}
        />
        <div className="mt-2 text-xs text-zinc-500">
          Tip: the clearer the goal, the less the output will roast you.
        </div>
      </Card>

      {/* ENGINES */}
      <Card title="ENGINES">
        <div className="flex gap-3">
          <button disabled={!goalValid || loading} onClick={() => run("plan")} className="btn">
            Plan
          </button>

          <button
            disabled={!goalValid || loading}
            onClick={() => run("workout")}
            className="btn"
          >
            Workout
          </button>

          <button
            disabled={!goalValid || loading}
            onClick={() => run("summary")}
            className="btn"
          >
            Summary
          </button>
        </div>

        {!goalValid && (
          <div className="mt-2 text-xs text-zinc-500">
            Enter a goal first, boss.
          </div>
        )}
      </Card>

      {/* RESULT */}
      <Card title="RESULT">
        <ResultView data={result} loading={loading} />
      </Card>
    </main>
  );
}
