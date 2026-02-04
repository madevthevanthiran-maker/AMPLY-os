"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  reminders?: Reminder[];
};

type Reminder = {
  id: string;
  eventId: string;
  remindAt: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  event?: CalendarEvent;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [remindAt, setRemindAt] = useState("");

  async function refreshAll() {
    setLoading(true);
    setMsg("");
    try {
      const [eRes, rRes] = await Promise.all([
        fetch("/api/calendar/events", { cache: "no-store" }),
        fetch("/api/calendar/reminders", { cache: "no-store" }),
      ]);

      const eJson = await eRes.json();
      const rJson = await rRes.json();

      if (!eJson.ok) throw new Error(eJson.error || "Failed to load events");
      if (!rJson.ok) throw new Error(rJson.error || "Failed to load reminders");

      setEvents(eJson.events ?? []);
      setReminders(rJson.reminders ?? []);
    } catch (err: any) {
      setMsg(err?.message ?? "Something exploded");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [events]);

  async function createEvent() {
    setMsg("");
    if (!title || !startTime || !endTime) {
      setMsg("Bro… title/start/end required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          startTime,
          endTime,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create event");

      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");

      await refreshAll();
      setMsg("✅ Event created");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to create event");
    } finally {
      setLoading(false);
    }
  }

  async function createReminder() {
    setMsg("");
    if (!selectedEventId || !remindAt) {
      setMsg("Pick an event + reminder time.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/calendar/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          remindAt,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to create reminder");

      setRemindAt("");
      await refreshAll();
      setMsg("✅ Reminder created");
    } catch (err: any) {
      setMsg(err?.message ?? "Failed to create reminder");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Calendar
      </h1>

      {msg ? (
        <div style={{ marginBottom: 12, opacity: 0.9 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
            Create Event
          </h2>

          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            />
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={inputStyle}
            />
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={inputStyle}
            />
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={inputStyle}
            />

            <button onClick={createEvent} disabled={loading} style={btnStyle}>
              {loading ? "Working..." : "Create Event"}
            </button>
          </div>
        </section>

        <section style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
            Add Reminder
          </h2>

          <div style={{ display: "grid", gap: 8 }}>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select event…</option>
              {sortedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} — {new Date(ev.startTime).toLocaleString()}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              style={inputStyle}
            />

            <button onClick={createReminder} disabled={loading} style={btnStyle}>
              {loading ? "Working..." : "Create Reminder"}
            </button>
          </div>
        </section>

        <section style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
            Events
          </h2>

          {sortedEvents.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No events yet. Be chaotic elsewhere.</div>
          ) : (
            <ul style={{ display: "grid", gap: 10, paddingLeft: 18 }}>
              {sortedEvents.map((ev) => (
                <li key={ev.id}>
                  <div style={{ fontWeight: 600 }}>{ev.title}</div>
                  <div style={{ opacity: 0.9 }}>
                    {new Date(ev.startTime).toLocaleString()} →{" "}
                    {new Date(ev.endTime).toLocaleString()}
                  </div>
                  {ev.description ? <div style={{ opacity: 0.8 }}>{ev.description}</div> : null}
                  <div style={{ opacity: 0.8 }}>
                    Reminders: {ev.reminders?.length ?? 0}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>
            Reminders
          </h2>

          {reminders.length === 0 ? (
            <div style={{ opacity: 0.8 }}>No reminders yet.</div>
          ) : (
            <ul style={{ display: "grid", gap: 10, paddingLeft: 18 }}>
              {reminders.map((r) => (
                <li key={r.id}>
                  <div style={{ fontWeight: 600 }}>
                    {r.event?.title ?? r.eventId}
                  </div>
                  <div style={{ opacity: 0.9 }}>
                    remindAt: {new Date(r.remindAt).toLocaleString()}
                  </div>
                  <div style={{ opacity: 0.8 }}>
                    sentAt: {r.sentAt ? new Date(r.sentAt).toLocaleString() : "not sent"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button onClick={refreshAll} disabled={loading} style={btnStyle}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #333",
  background: "transparent",
  color: "inherit",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #333",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
};
