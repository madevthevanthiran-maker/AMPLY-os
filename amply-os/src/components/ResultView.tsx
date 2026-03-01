import type { EngineResponse, CoachStep } from "@/lib/engineTypes";
import { getPrimaryList } from "@/lib/engineTypes";

type Props = {
  data: EngineResponse | null;
  loading?: boolean;
};

export default function ResultView({ data, loading = false }: Props) {
  if (loading) {
    return <div className="text-xs text-zinc-400">Thinking…</div>;
  }

  if (!data) {
    return (
      <div className="text-xs text-zinc-500">
        Hit one of the buttons to see the result.
      </div>
    );
  }

  const list = getPrimaryList(data);

  return (
    <div className="space-y-3">
      <div className="text-xs text-zinc-400">Engine: {data.engine}</div>

      {/* Primary list */}
      <div className="space-y-2">
        {list.map((item: string, i: number) => (
          <div
            key={`${data.engine}-${i}`}
            className="rounded-md border border-zinc-800 bg-black/30 px-3 py-2 text-sm"
          >
            {item}
          </div>
        ))}
      </div>

      {/* Coach block */}
      {data.coach ? (
        <div className="rounded-md border border-zinc-800 bg-black/20 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">AMP Coach</div>
            <div className="text-xs text-zinc-400">
              Priority: {data.coach.priority}
            </div>
          </div>

          <div className="space-y-2">
            {data.coach.steps.map((s: CoachStep) => (
              <div
                key={s.id}
                className="rounded-md border border-zinc-800 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{s.title}</div>
                  {typeof s.durationMins === "number" ? (
                    <div className="text-xs text-zinc-400">{s.durationMins}m</div>
                  ) : null}
                </div>

                {s.why ? (
                  <div className="mt-1 text-xs text-zinc-400">{s.why}</div>
                ) : null}

                {s.successCheck ? (
                  <div className="mt-2 text-xs">
                    <span className="text-zinc-400">Success:</span>{" "}
                    {s.successCheck}
                  </div>
                ) : null}

                {s.nextIfStuck ? (
                  <div className="mt-1 text-xs">
                    <span className="text-zinc-400">If stuck:</span>{" "}
                    {s.nextIfStuck}
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

      {/* Raw JSON */}
      <details className="rounded-md border border-zinc-800 bg-black/20 p-3">
        <summary className="cursor-pointer text-xs text-zinc-400">
          Raw JSON
        </summary>
        <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
