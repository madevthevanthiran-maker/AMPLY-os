// src/app/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isDashboard =
    pathname === "/dashboard" || pathname?.startsWith("/dashboard/");

  const isCalendar = pathname?.startsWith("/dashboard/calendar");
  const isChat = pathname === "/chat" || pathname?.startsWith("/chat/");

  return (
    <div className="min-h-screen bg-black text-white">
      {isDashboard && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur">
          <div className="mx-auto w-full max-w-4xl px-6">
            <div className="flex items-center justify-between py-3">
              <div className="text-sm font-semibold tracking-wide text-white">
                AMPLY OS <span className="text-white/40">•</span>{" "}
                <span className="text-white/70">AMP</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Dashboard shortcut */}
                <Link
                  href="/dashboard"
                  className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/15 ${
                    pathname === "/dashboard" ? "bg-white/15" : "bg-white/10"
                  }`}
                  aria-label="Open dashboard"
                  title="Dashboard"
                >
                  🏠 Dashboard
                </Link>

                {/* Chat shortcut */}
                <Link
                  href="/chat"
                  className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/15 ${
                    isChat ? "bg-white/15" : "bg-white/10"
                  }`}
                  aria-label="Open chat"
                  title="Chat"
                >
                  💬 Chat
                </Link>

                {/* Calendar shortcut */}
                <Link
                  href="/dashboard/calendar"
                  className={`rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/15 ${
                    isCalendar ? "bg-white/15" : "bg-white/10"
                  }`}
                  aria-label="Open calendar"
                  title="Calendar"
                >
                  📅 Calendar
                </Link>

                <NotificationBell />
              </div>
            </div>
          </div>
        </header>
      )}

      <main>{children}</main>
    </div>
  );
}
