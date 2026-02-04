"use client";

export type Mode = "student" | "freelancer" | "creator";

interface ModeSelectorProps {
  value: Mode;
  onChange: (m: Mode) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const modes: { label: string; value: Mode }[] = [
    { label: "Student", value: "student" },
    { label: "Freelancer", value: "freelancer" },
    { label: "Creator", value: "creator" },
  ];

  return (
    <div className="flex gap-2">
      {modes.map((m) => {
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={[
              "px-4 py-2 rounded-lg border transition",
              active
                ? "bg-blue-600 border-blue-500 text-white"
                : "bg-black/30 border-zinc-700 text-zinc-200 hover:bg-black/50",
            ].join(" ")}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
