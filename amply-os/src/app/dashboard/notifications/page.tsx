"use client";

import { useEffect, useMemo, useState } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  dueAt: string | null;
  readAt: string | null;
  createdAt: string;
  event?: { id: string; title: string } | null;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(true);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("limit", "100");
    if (unreadOnly) qs.set("unreadOnly", "1");

    const res = await fetch(`/api/calendar/notifications?${qs.toString()}`);
    const json = await res.json();
    setItems(json.notifications ?? []);
    setLoading(false);
  }

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    await fetch("/api/calendar/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const unreadCount = useMemo(
    () => items.filter((x) => !x.readAt).length,
    [items]
  );

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Notifications</h1>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {unreadOnly ? "Showing: Unread" : "Showing: All"}
          </button>

          <button
            className="rounded-lg border px-3 py-1 text-sm"
            onClick={() => markRead(items.filter((x) => !x.readAt).map((x) => x.id))}
          >
            Mark all read
          </button>

          <button className="rounded-lg border px-3 py-1 text-sm" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="text-sm opacity-70">
        Unread: <span className="font-medium">{unreadCount}</span>
      </div>

      {loading ? (
        <div className="opacity-70">Loading… (I promise I’m doing something)</div>
      ) : items.length === 0 ? (
        <div className="opacity-70">No notifications yet. Go create chaos.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 ${
                n.readAt ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{n.title}</div>
                  {n.body ? (
                    <div className="text-sm opacity-80 mt-1">{n.body}</div>
                  ) : null}
                  <div className="text-xs opacity-60 mt-2">
                    {n.dueAt ? `Due: ${new Date(n.dueAt).toLocaleString()}` : null}
                    {" · "}
                    {`Created: ${new Date(n.createdAt).toLocaleString()}`}
                  </div>
                </div>

                {!n.readAt ? (
                  <button
                    className="rounded-lg border px-3 py-1 text-sm"
                    onClick={() => markRead([n.id])}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
