import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/engines";

export async function GET() {
  return NextResponse.json({ ok: true, message: "Plan API route working ✅" });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode ?? "student";
  const goal = body?.goal ?? "";

  const plan = generatePlan(mode, goal);

  return NextResponse.json({
    ok: true,
    source: "plan route",
    received: { mode, goal },
    plan,
  });
}
