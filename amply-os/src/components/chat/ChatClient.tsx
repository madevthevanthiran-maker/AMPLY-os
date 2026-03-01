"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";

type Msg = {
  id?: string;
  role: Role;
  text: string;
  ts: number; // epoch ms
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function formatTimeClient(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function apiGET(url: string) {
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `GET failed: ${res.status}`);
  return json;
}

async function apiPOST(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `POST failed: ${res.status}`);
  return json;
}

const STARTER: Msg = {
  role: "assistant",
  text: "AMP online. Give me the outcome — I’ll drive.",
  ts: Date.now(),
};

export default function ChatClient() {
  const mounted = useMounted();

  const [mode, setMode] = useState<string>("student");
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  // Load session + messages on mode change
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");

      try {
        // session endpoint can return:
        // { ok:true, session:{id} } OR { ok:true, sessionId:"..." }
        const s = await apiGET(`/api/chat/session?mode=${encodeURIComponent(mode)}`);
        if (!alive) return;

        const sid =
          (typeof s?.sessionId === "string" && s.sessionId) ||
          (typeof s?.session?.id === "string" && s.session.id) ||
          "";

        if (!sid) throw new Error("No sessionId returned from /api/chat/session");

        setSessionId(sid);

        // messages endpoint can return:
        // { ok:true, messages:[...] } (and maybe sessionId)
        const m = await apiGET(
          `/api/chat/messages?mode=${encodeURIComponent(mode)}&sessionId=${encodeURIComponent(
            sid
          )}&limit=200`
        );
        if (!alive) return;

        const dbMsgs = Array.isArray(m?.messages) ? m.messages : [];

        const cleaned: Msg[] = dbMsgs.map((x: any) => ({
          id: x.id,
          role: x.role === "assistant" ? "assistant" : "user",
          text: String(x.text ?? ""),
          ts: Number(x.ts) || Date.now(),
        }));

        // If DB is empty, show starter message so UI doesn't look dead
        setMessages(cleaned.length ? cleaned : [STARTER]);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load chat");
        // still show starter so the screen isn't blank
        setMessages([STARTER]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mode]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setErr("");

    const userMsg: Msg = { role: "user", text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      // Persist user message
      await apiPOST("/api/chat/messages", { sessionId, mode, role: "user", text });

      // Call assistant
      const res = await apiPOST("/api/assistant", {
        mode,
        message: text,
        history: [],
      });

      const assistantText =
        (typeof res?.assistant?.text === "string" && res.assistant.text) ||
        (typeof res?.text === "string" && res.text) ||
        (typeof res?.message === "string" && res.message) ||
        "…";

      const botMsg: Msg = { role: "assistant", text: assistantText, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);

      // Persist assistant message
      await apiPOST("/api/chat/messages", {
        sessionId,
        mode,
        role: "assistant",
        text: assistantText,
      });
    } catch (e: any) {
      setErr(e?.message || "Send failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `AMP error: ${e?.message || "Send failed"}`, ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <div className="rounded-2xl border border-white/10 bg-black/30 shadow-xl">
        <div
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-4"
        >
          {loading ? (
            <div className="text-sm text-white/45">Loading chat…</div>
          ) : null}

          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id ?? `${m.role}-${m.ts}-${idx}`}
                className={cn(isUser ? "ml-auto max-w-[86%]" : "mr-auto max-w-[86%]")}
              >
                <div
                  className={cn(
                    "text-xs",
                    isUser ? "text-right text-white/40" : "text-left text-white/35"
                  )}
                  suppressHydrationWarning
                >
                  {isUser ? "You" : "AMP"} {mounted ? `• ${formatTimeClient(m.ts)}` : ""}
                </div>

                <div
                  className={cn(
                    "mt-1 rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                      ? "bg-white text-black"
                      : "bg-white/5 text-white border border-white/10"
                  )}
                >
                  {m.text}
                </div>
              </div>
            );
          })}

          {sending ? (
            <div className="mr-auto max-w-[86%]">
              <div className="text-left text-xs text-white/35">AMP • …</div>
              <div className="mt-1 rounded-2xl px-4 py-3 text-sm bg-white/5 text-white border border-white/10">
                Thinking…
              </div>
            </div>
          ) : null}
        </div>

        {err ? <div className="px-4 pb-2 text-xs text-red-400">{err}</div> : null}

        <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message AMP…"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/25"
          />

          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
          >
            <option value="student">student</option>
            <option value="founder">founder</option>
            <option value="coach">coach</option>
          </select>

          <button
            disabled={!canSend}
            onClick={send}
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium transition",
              canSend
                ? "bg-white text-black hover:bg-white/90"
                : "bg-white/20 text-white/40 cursor-not-allowed"
            )}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
