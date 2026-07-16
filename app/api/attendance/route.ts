import { NextResponse } from "next/server";
import { listAttendance, listStaff, pushNotification, upsertAttendance } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") ?? undefined;
    return NextResponse.json(await listAttendance(date));
  } catch (err) {
    console.error("GET /api/attendance failed:", err);
    return NextResponse.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      staffId: string;
      date: string;
      checkIn?: string | null;
      checkOut?: string | null;
      status?: string;
      notes?: string;
    };
    if (!body.staffId || !body.date) {
      return NextResponse.json({ error: "staffId and date are required" }, { status: 400 });
    }
    const { staffId, date, ...patch } = body;
    const updated = await upsertAttendance(staffId, date, patch as any);

    if (patch.status === "absent" || patch.status === "on-leave") {
      const staffList = await listStaff();
      const member = staffList.find((s) => s.id === staffId);
      if (member) {
        await pushNotification({
          category: "Warehouse",
          message: `${member.name} was marked ${patch.status === "on-leave" ? "on leave" : "absent"} for ${date}.`,
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("POST /api/attendance failed:", err);
    return NextResponse.json({ error: "Failed to update attendance" }, { status: 500 });
  }
}
