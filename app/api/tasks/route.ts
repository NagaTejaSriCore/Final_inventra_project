import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { createTask, findStaffByEmail, listTasks } from "@/lib/hr-store";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (session.role === "Admin") {
      return NextResponse.json(await listTasks());
    }
    // Store Staff only ever see tasks assigned to them.
    const staff = await findStaffByEmail(session.email);
    if (!staff) return NextResponse.json([]);
    return NextResponse.json(await listTasks(staff.id));
  } catch (err) {
    console.error("GET /api/tasks failed:", err);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Only Admin can assign new tasks.
  if (session.role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    if (!body.title || !body.assignedToStaffId) {
      return NextResponse.json({ error: "title and assignedToStaffId are required" }, { status: 400 });
    }
    const created = await createTask(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks failed:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
