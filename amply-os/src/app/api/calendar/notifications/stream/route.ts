// src/app/api/calendar/notifications/stream/route.ts
import { getNotifBus } from "@/lib/notifyBus";

export const runtime = "nodejs";

export async function GET() {
  const bus = getNotifBus();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const send = (event: string, data: any) => {
        safeEnqueue(`event: ${event}\n`);
        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      // initial hello
      send("hello", { ok: true, ts: Date.now() });

      const onNew = (payload: any) => send("new", payload);
      const onRead = (payload: any) => send("read", payload);

      bus.on("new", onNew);
      bus.on("read", onRead);

      const keepAlive = setInterval(() => {
        // will no-op once closed
        safeEnqueue(`event: ping\ndata: {}\n\n`);
      }, 25_000);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepAlive);
        bus.off("new", onNew);
        bus.off("read", onRead);
        try {
          controller.close();
        } catch {}
      };

      // If client disconnects, cancel() will run and call cleanup.
      // Also, if any enqueue fails, we mark closed and interval stops sending.
      // @ts-ignore
      controller._cleanup = cleanup;
    },
    cancel() {
      // @ts-ignore
      this?._cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
