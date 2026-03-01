"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Brief = {
  ok: boolean;
  unreadCount: number;
  text: string;
};

type Msg = {
  role: "amp" | "user";
  text: string;
};

export default function AmpPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "amp", text: "AMP online. Tell me what we’re doing." },
  ]);
  const [input, setInput] = useState("");

  async function refreshBrief() {
    setLoading(true);
    const res = await fetch("/api/amp/brief?limit=5", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as Brief | null;
    if (json?.ok) setBrief(json);
    setLoading(false);
  }

  async function runAction(action: "mark_all_read") {
    setLoading(true);
    await fetch("/api/amp/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await refreshBrief();
    setLoading(false);
  }

  function send() {
    const t = input.trim();
    if (!t) return;

    setMessages((prev) => [...prev, { role: "user", text: t }]);
    setInput("");

    // v1: deterministic commands
    const lower = t.toLowerCase();
    if (lower.includes("brief") || lower.includes("status")) {
      refreshBrief();
      setMessages((prev) => [
        ...prev,
        { role: "amp", text: "Pulling current status." },
      ]);
      return;
    }

    if (lower.includes("mark all") || lower.includes("clear")) {
      runAction("mark_all_read");
      setMessages((prev) => [
        ...prev,
        { role: "amp", text: "Clearing unread alerts." },
      ]);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "amp",
        text:
          "I can do: 'brief' (status) or 'mark all read' (clear alerts). Next: I’ll route this into engines + actions.",
      },
    ]);
  }

  useEffect(() => {
    refreshBrief();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-6 text-white space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xl font-semibold">AMP</div>
          <div className="text-xs text-white/50">
            <Link href="/dashboard" className="hover:underline">
              ← Back to dashboard
            </Link>{" "}
            ·{" "}
            <Link href="/dashboard/notifications" className="hover:underline">
              Notifications
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            onClick={refreshBrief}
            type="button"
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            onClick={() => runAction("mark_all_read")}
            type="button"
            disabled={loading || (brief?.unreadCount ?? 0) === 0}
          >
            Mark all read
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-medium">System Brief</div>
        <div className="mt-2 text-sm text-white/80 whitespace-pre-wrap">
          {loading && !brief
            ? "Loading…"
            : brief?.text ?? "No data yet. Hit Refresh."}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
        <div className="text-sm font-medium">Chat</div>

        <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`rounded-lg border border-white/10 px-3 py-2 text-sm ${
                m.role === "amp" ? "bg-white/5" : "bg-white/10"
              }`}
            >
              <div className="text-xs text-white/50 mb-1">
                {m.role === "amp" ? "AMP" : "You"}
              </div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Try: brief / mark all read"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            onClick={send}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
