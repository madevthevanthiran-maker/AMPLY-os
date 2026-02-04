import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Workout API route working ✅",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body?.mode ?? "student";
    const goal = body?.goal ?? "";

    // basic demo output (we'll make it smarter later)
    const workout =
      mode === "student"
        ? [
            "5 min warm-up (jumping jacks / brisk walk)",
            "Push-ups: 3 sets (stop 2 reps before failure)",
            "Rows (band/dumbbell): 3 sets",
            "Squats: 3 sets",
            "Plank: 2 x 45s",
            "Cool down + stretch 5 min",
          ]
        : [
            "10 min mobility + posture reset",
            "Shoulders & back: 4 movements, 3 sets each",
            "Core finisher: 6 min circuit",
            "Walk 15 min to decompress",
          ];

    return NextResponse.json({
      ok: true,
      source: "workout route",
      received: { mode, goal },
      workout,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
