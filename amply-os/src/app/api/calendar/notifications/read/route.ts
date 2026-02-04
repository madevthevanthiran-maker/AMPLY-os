import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ids: string[] = body?.ids ?? [];

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "ids[] is required" },
        { status: 400 }
      );
    }

    const res = await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ ok: true, updated: res.count });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
