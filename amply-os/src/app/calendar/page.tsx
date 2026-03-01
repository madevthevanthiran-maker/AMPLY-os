// src/app/dashboard/calendar/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
};

type Notification = {
  id: string;
  title: string;
  body: string | null;
  channel: string;
  createdAt: string;
  readAt: string | null;
  eventId: string;
  reminderId: string | null;
  event?: CalendarEvent | null;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [runnerLoading, setRunnerLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifs.filter((n) => !n.readAt).length,
    [notifs]
  );

  async function loadEvents() {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/events", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok) setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifs(unreadOnly = false) {
    setNotifLoading(true);
    try {
      const res = await fetch(
        `/api/calendar/notifications?limit=50${unreadOnly ? "&unreadOnly=1" : ""}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data?.ok) setNotifs(data.notifications || []);
    } finally {
      setNotifLoading(false);
    }
  }

  async function runReminders() {
    setRunnerLoading(true);
    try {
      // Creates notifications for reminders that are due (remindAt <= now and sentAt null)
      const res = await fetch("/api/calendar/reminders/run?limit=50", {
        cache: "no-store",
      });
      const data = await res.json();

      // Refresh notifications after runner
      await loadNotifs(false);

      return data;
    } finally {
      setRunnerLoading(false);
    }
  }

  async function markRead(id: string) {
    const res = await fetch("/api/calendar/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    const data = await res.json();
    if (data?.ok) {
      setNotifs((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    }
  }

  useEffect(() => {
    loadEvents();
    loadNotifs(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link
              href="/dashboard"
              className="mt-0.5 inline-flex items-center rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              title="Back to dashboard"
            >
              ← Dashboard
            </Link>

            <div>
              <div className="text-sm uppercase tracking-wide text-white/60">
                Calendar
              </div>
              <div className="text-xl font-semibold text-white">
                Events + Notifications
              </div>
              <div className="mt-1 text-sm text-white/60">
                Unread: <span className="text-white">{unreadCount}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadNotifs(true)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              disabled={notifLoading}
              title="Show unread only"
            >
              {notifLoading ? "Loading..." : "Unread only"}
            </button>

            <button
              onClick={() => loadNotifs(false)}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              disabled={notifLoading}
              title="Show all"
            >
              {notifLoading ? "Loading..." : "All notifs"}
            </button>

            <button
              onClick={runReminders}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-60"
              disabled={runnerLoading}
              title="Runs the reminder runner (creates notifications for due reminders)"
            >
              {runnerLoading ? "Running..." : "Run reminders"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-white">Events</div>
            <button
              onClick={loadEvents}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {events.length === 0 ? (
              <div className="text-sm text-white/60">No events yet.</div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="text-white font-medium">{ev.title}</div>
                  {ev.description ? (
                    <div className="text-sm text-white/60">{ev.description}</div>
                  ) : null}
                  <div className="mt-2 text-xs text-white/50">
                    {new Date(ev.startTime).toLocaleString()} →{" "}
                    {new Date(ev.endTime).toLocaleString()}
                  </div>
                  <div className="mt-1 text-[10px] text-white/40">
                    id: {ev.id}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold text-white">Notifications</div>
          <div className="mt-4 space-y-3">
            {notifs.length === 0 ? (
              <div className="text-sm text-white/60">
                No notifications. (Your app is being peaceful for once.)
              </div>
            ) : (
              notifs.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-white font-medium">{n.title}</div>
                        {!n.readAt ? (
                          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white">
                            UNREAD
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                            read
                          </span>
                        )}
                      </div>

                      {n.body ? (
                        <div className="mt-1 text-sm text-white/60">{n.body}</div>
                      ) : null}

                      {n.event?.title ? (
                        <div className="mt-2 text-xs text-white/50">
                          Event: {n.event.title}
                        </div>
                      ) : null}

                      <div className="mt-2 text-[10px] text-white/40">
                        {new Date(n.createdAt).toLocaleString()} • id: {n.id}
                      </div>
                    </div>

                    <button
                      onClick={() => markRead(n.id)}
                      disabled={!!n.readAt}
                      className="shrink-0 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15 disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
                                                                                                                                   