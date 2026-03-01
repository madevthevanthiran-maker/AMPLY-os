"use client";

import { useEffect, useMemo, useState } from "react";

type ReminderItem = {
  id: string;
  remindAt: string;
  sentAt: string | null;
};

type EventItem = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  reminders?: ReminderItem[];
};

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function CalendarUiPage() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [start, setStart] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [end, setEnd] = useState(() =>
    toLocalInputValue(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );

  const [creating, setCreating] = useState(false);

  const upcomingCount = useMemo(() => items.length, [items]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/events?limit=50&upcomingOnly=1", {
        cache: "no-store",
      });
      const json = await res.json();
      if (json?.ok) setItems(json.events || []);
    } finally {
      setLoading(false);
    }
  }

  async function createEvent() {
    if (!title.trim()) return alert("Give the event a title.");

    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      return alert("End time must be after start time.");
    }

    setCreating(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() ? description.trim() : null,
          startTime: startIso,
          endTime: endIso,
        }),
      });

      const json = await res.json();
      if (!json?.ok) return alert(json?.error || "Failed to create event");

      setTitle("");
      setDescription("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function addReminder(eventId: string, minutesBefore: number) {
    const ev = items.find((x) => x.id === eventId);
    if (!ev) return;

    const startTime = new Date(ev.startTime).getTime();
    const remindAt = new Date(startTime - minutesBefore * 60_000).toISOString();

    const res = await fetch("/api/calendar/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, remindAt }),
    });

    const json = await res.json();
    if (!json?.ok) return alert(json?.error || "Failed to add reminder");

    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-8 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-sm text-white/60">Dashboard</div>
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <div className="text-sm text-white/60 mt-1">
            Upcoming: <span className="text-white">{upcomingCount}</span>
          </div>
          <div className="text-xs text-white/50 mt-1">
            Debug page is at{" "}
            <span className="text-white/70">/dashboard/calendar</span>
          </div>
        </div>

        <button
          onClick={load}
          className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          type="button"
        >
          Refresh
        </button>
      </div>

      {/* Create Event */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="text-sm font-semibold">Create event</div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full min-h-[80px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <div className="text-xs text-white/60">Start</div>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </label>

          <label className="space-y-1">
            <div className="text-xs text-white/60">End</div>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={createEvent}
            disabled={creating}
            className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
            type="button"
          >
            {creating ? "Creating…" : "Create"}
          </button>

          <div className="text-xs text-white/50">
            AMP will remind you. Whether you listen is… a personal choice.
          </div>
        </div>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        <div className="text-sm font-semibold">Upcoming events</div>

        {loading ? (
          <div className="text-sm text-white/60">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-white/60">
            No events. Peaceful. Suspiciously peaceful.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((e) => (
              <div
                key={e.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold">{e.title}</div>
                    {e.description ? (
                      <div className="text-sm text-white/70 mt-1">
                        {e.description}
                      </div>
                    ) : null}
                    <div className="text-xs text-white/55 mt-2">
                      {new Date(e.startTime).toLocaleString()} →{" "}
                      {new Date(e.endTime).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="text-xs text-white/60 mr-2">Remind me:</div>
                  {[5, 10, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => addReminder(e.id, m)}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs hover:bg-white/10"
                      type="button"
                    >
                      {m}m before
                    </button>
                  ))}

                  <div className="ml-auto text-xs text-white/50">
                    {(e.reminders?.length ?? 0) > 0
                      ? `Reminders: ${e.reminders?.length}`
                      : "No reminders yet"}
                  </div>
                </div>

                {e.reminders?.length ? (
                  <div className="mt-3 space-y-1 text-xs text-white/60">
                    {e.reminders.map((r) => (
                      <div key={r.id} className="flex justify-between">
                        <div>
                          Remind at: {new Date(r.remindAt).toLocaleString()}
                        </div>
                        <div className="text-white/50">
                          {r.sentAt ? "sent ✅" : "pending ⏳"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
