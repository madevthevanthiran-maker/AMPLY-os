import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ActionBody =
  | { action: "mark_all_read" }
  | { action: "mark_read"; ids: string[] };

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<ActionBody>;
    const action = body.action;

    if (action === "mark_all_read") {
      const res = await fetch(
        new URL("/api/calendar/notifications/read-all", req.url),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unreadOnly: true }),
        }
      );
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    if (action === "mark_read") {
      const ids = Array.isArray((body as any).ids) ? (body as any).ids : [];
      const res = await fetch(
        new URL("/api/calendar/notifications/read", req.url),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        }
      );
      const json = await res.json();
      return NextResponse.json(json, { status: res.status });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
