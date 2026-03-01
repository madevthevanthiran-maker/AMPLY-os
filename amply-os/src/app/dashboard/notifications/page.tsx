"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type NotificationItem = {
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
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = useMemo(
    () => items.filter((x) => !x.readAt).length,
    [items]
  );

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      qs.set("limit", "100");
      if (unreadOnly) qs.set("unreadOnly", "1");

      const res = await fetch(`/api/calendar/notifications?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || json?.ok === false) {
        setError(json?.error || `Failed to load (${res.status})`);
        setItems([]);
      } else {
        setItems(json.notifications ?? []);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setItems([]);
    } finally {
      setLoading(false);
    }
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

  async function markAllRead() {
    // Proper API call (no sending 100 IDs like it’s 2012)
    await fetch("/api/calendar/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unreadOnly: true }),
    });

    await load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Notifications</h1>
          <div className="text-xs text-white/50">
            <Link href="/dashboard" className="hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            onClick={() => setUnreadOnly((v) => !v)}
            type="button"
          >
            {unreadOnly ? "Showing: Unread" : "Showing: All"}
          </button>

          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            onClick={markAllRead}
            type="button"
            disabled={unreadCount === 0}
            title={unreadCount === 0 ? "Nothing to clear" : "Mark all unread as read"}
          >
            Mark all read
          </button>

          <button
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
            onClick={load}
            type="button"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="text-sm text-white/70">
        Unread: <span className="font-medium text-white">{unreadCount}</span>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="opacity-70">Loading… (AMP is running, relax)</div>
      ) : items.length === 0 ? (
        <div className="opacity-70">No notifications yet. Go create chaos.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border border-white/10 bg-white/5 p-4 ${
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
                    {n.dueAt ? " · " : ""}
                    {`Created: ${new Date(n.createdAt).toLocaleString()}`}
                    {n.event?.title ? ` · Event: ${n.event.title}` : ""}
                  </div>
                </div>

                {!n.readAt ? (
                  <button
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
                    onClick={() => markRead([n.id])}
                    type="button"
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
