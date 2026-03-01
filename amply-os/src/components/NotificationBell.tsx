"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  createdAt: string;
  readAt: string | null;
};

const SOUND_KEY = "amply_notif_sound_enabled";
const DESKTOP_KEY = "amply_notif_desktop_enabled";

// event name used to sync unread count with AppShell (tab title)
const UNREAD_EVENT = "amply:unread";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // null until mounted (prevents hydration mismatch)
  const [soundEnabled, setSoundEnabled] = useState<boolean | null>(null);

  // desktop toggles (separate from browser permission)
  const [desktopEnabled, setDesktopEnabled] = useState<boolean | null>(null);
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission | null>(
    null
  );

  const prevUnreadRef = useRef<number>(0);
  const initializedRef = useRef(false);

  // Keep one AudioContext (more reliable than recreating)
  const audioCtxRef = useRef<AudioContext | null>(null);

  const unreadCount = useMemo(
    () => notifs.filter((n) => !n.readAt).length,
    [notifs]
  );

  const latestUnread = useMemo(() => {
    // notifications endpoint returns newest-first, so find first unread
    return notifs.find((n) => !n.readAt) || null;
  }, [notifs]);

  async function load() {
    const res = await fetch("/api/calendar/notifications?limit=5&unreadOnly=1", {
      cache: "no-store",
    });
    const json = await res.json();
    if (json?.ok) setNotifs(json.notifications || []);
  }

  async function markRead(id: string) {
    await fetch("/api/calendar/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  function getAudioCtx() {
    if (!mounted) return null;
    if (audioCtxRef.current) return audioCtxRef.current;

    const AudioCtx =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    audioCtxRef.current = new AudioCtx();
    return audioCtxRef.current;
  }

  async function unlockAudio() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  function beep({ freq = 880, dur = 0.12, gainLevel = 0.05 } = {}) {
    if (!mounted || soundEnabled !== true) return;

    const ctx = getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainLevel, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // ignore
    }
  }

  function syncUnreadToAppShell(count: number) {
    if (!mounted) return;
    try {
      window.dispatchEvent(
        new CustomEvent(UNREAD_EVENT, { detail: { count } })
      );
    } catch {
      // ignore
    }
  }

  function refreshDesktopPermission() {
    if (!mounted) return;
    try {
      setDesktopPerm(Notification.permission);
    } catch {
      setDesktopPerm(null);
    }
  }

  async function requestDesktopPermission() {
    if (!mounted) return false;
    if (typeof Notification === "undefined") return false;

    try {
      // if already granted/denied, this won't prompt
      const perm = await Notification.requestPermission();
      setDesktopPerm(perm);
      return perm === "granted";
    } catch {
      return false;
    }
  }

  function sendDesktopNotification(n: NotificationItem) {
    if (!mounted) return;
    if (desktopEnabled !== true) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    try {
      // Keep it clean: title + body + click -> dashboard
      const notif = new Notification(n.title || "AMP", {
        body: n.body || "Incoming alert.",
        silent: true, // we already do our own beep; change later if you want
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {}
        try {
          window.location.href = "/dashboard";
        } catch {}
        try {
          notif.close();
        } catch {}
      };

      // auto close after a bit
      setTimeout(() => {
        try {
          notif.close();
        } catch {}
      }, 8000);
    } catch {
      // some browsers block if not triggered recently; ignore
    }
  }

  async function toggleSound() {
    // This click is a user gesture — use it to unlock audio.
    await unlockAudio();

    setSoundEnabled((prev) => {
      const next = !(prev ?? false);
      try {
        localStorage.setItem(SOUND_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // (A) Optional: when enabling sound, also try to enable desktop permission if still default
    // This is still a user gesture, so it can show the browser prompt.
    if (desktopEnabled === true && desktopPerm === "default") {
      await requestDesktopPermission();
    }
  }

  async function toggleDesktop() {
    const next = !(desktopEnabled ?? false);

    setDesktopEnabled(next);
    try {
      localStorage.setItem(DESKTOP_KEY, JSON.stringify(next));
    } catch {}

    // If turning ON, request permission (B)
    if (next) {
      await requestDesktopPermission();
    } else {
      // turning off: no permission changes (browser controls that)
      refreshDesktopPermission();
    }
  }

  // When soundEnabled flips ON, do a quick test beep (confirms it works)
  useEffect(() => {
    if (!mounted) return;
    if (soundEnabled === true) {
      beep({ freq: 988, dur: 0.10, gainLevel: 0.06 });
      setTimeout(() => beep({ freq: 784, dur: 0.10, gainLevel: 0.06 }), 140);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, mounted]);

  // mount + load preferences
  useEffect(() => {
    setMounted(true);

    // sound preference
    try {
      const raw = localStorage.getItem(SOUND_KEY);
      setSoundEnabled(raw ? JSON.parse(raw) : false);
    } catch {
      setSoundEnabled(false);
    }

    // desktop preference
    try {
      const raw = localStorage.getItem(DESKTOP_KEY);
      setDesktopEnabled(raw ? JSON.parse(raw) : false);
    } catch {
      setDesktopEnabled(false);
    }

    // permission snapshot
    refreshDesktopPermission();

    // initial fetch
    load();

    // slow fallback poll
    const poll = setInterval(load, 60_000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSE live updates
  useEffect(() => {
    if (!mounted) return;

    const es = new EventSource("/api/calendar/notifications/stream");
    const refresh = () => load();

    es.addEventListener("new", refresh);
    es.addEventListener("read", refresh);

    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Sync unread count upward so AppShell can update tab title
  useEffect(() => {
    if (!mounted) return;
    syncUnreadToAppShell(unreadCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, mounted]);

  // Alert behavior when unread increases AFTER first “stable” load
  useEffect(() => {
    if (!mounted) return;

    // First time we see unreadCount, just set baseline. No beep/popup.
    if (!initializedRef.current) {
      prevUnreadRef.current = unreadCount;
      initializedRef.current = true;
      return;
    }

    const prev = prevUnreadRef.current;
    if (unreadCount > prev) {
      // Actual new notif: beep + desktop popup (if enabled)
      beep({ freq: 880, dur: 0.14, gainLevel: 0.06 });

      if (latestUnread) {
        sendDesktopNotification(latestUnread);
      } else {
        // fallback payload
        sendDesktopNotification({
          id: "unknown",
          title: "AMP",
          body: "Incoming alert.",
          createdAt: new Date().toISOString(),
          readAt: null,
        });
      }
    }

    prevUnreadRef.current = unreadCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadCount, mounted, latestUnread]);

  const soundUi = soundEnabled === true ? "🔊" : "🔇";
  const soundTitle =
    soundEnabled === null
      ? "Sound"
      : soundEnabled
      ? "Sound: ON"
      : "Sound: OFF";

  const permLabel =
    desktopPerm === "granted"
      ? "granted"
      : desktopPerm === "denied"
      ? "blocked"
      : "not set";

  const desktopUi =
    desktopEnabled === true
      ? desktopPerm === "granted"
        ? "🛎️"
        : "⚠️"
      : "🔕";

  const desktopTitle =
    desktopEnabled === null
      ? "Desktop alerts"
      : desktopEnabled
      ? `Desktop alerts: ON (${permLabel})`
      : "Desktop alerts: OFF";

  return (
    <div className="relative flex items-center gap-2">
      {/* Desktop alerts toggle (B) */}
      <button
        type="button"
        onClick={toggleDesktop}
        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
        title={desktopTitle}
        aria-label={
          desktopEnabled === true
            ? "Disable desktop notifications"
            : "Enable desktop notifications"
        }
        suppressHydrationWarning
      >
        {desktopUi}
      </button>

      {/* Sound toggle */}
      <button
        type="button"
        onClick={toggleSound}
        className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
        title={soundTitle}
        aria-label={
          soundEnabled === true
            ? "Disable notification sound"
            : "Enable notification sound"
        }
        suppressHydrationWarning
      >
        {soundUi}
      </button>

      {/* Bell */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="relative rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white hover:bg-white/15"
          aria-label="Open notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-2 text-xs">
              {unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-white/10 bg-black/90 p-3 shadow-xl">
            <div className="mb-2 text-sm font-semibold text-white">
              Notifications
            </div>

            {notifs.length === 0 ? (
              <div className="text-xs text-white/60">
                All quiet. No fires to put out.
              </div>
            ) : (
              <div className="space-y-2">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-lg border border-white/10 bg-white/5 p-2"
                  >
                    <div className="text-sm text-white">{n.title}</div>
                    {n.body && (
                      <div className="text-xs text-white/60">{n.body}</div>
                    )}
                    <button
                      onClick={() => markRead(n.id)}
                      className="mt-1 text-xs text-blue-400 hover:underline"
                    >
                      Mark read
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Helpful hint if permission is blocked */}
            {desktopEnabled === true && desktopPerm === "denied" && (
              <div className="mt-3 text-xs text-white/50">
                Desktop alerts are blocked by the browser. Unblock in site
                settings to enable popups.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
