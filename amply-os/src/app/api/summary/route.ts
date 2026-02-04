import { NextResponse } from "next/server";
import { generateSummary } from "@/lib/engines";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Summary API route working ✅" });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode ?? "student";
  const goal = body?.goal ?? "";

  const summary = generateSummary(mode, goal);

  return NextResponse.json({
    ok: true,
    source: "summary route",
    received: { mode, goal },
    summary,
  });
}
