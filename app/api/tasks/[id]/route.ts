import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";
import { deleteTask, findStaffByEmail, listTasks, updateTask, updateTaskStatus } from "@/lib/hr-store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (session.role === "Admin") {
      const updated = await updateTask(params.id, body);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(updated);
    }

    // Store Staff may only change the status of a task assigned to them.
    const staff = await findStaffByEmail(session.email);
    if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const mine = await listTasks(staff.id);
    if (!mine.some((t) => t.id === params.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!body.status) return NextResponse.json({ error: "status is required" }, { status: 400 });
    const updated = await updateTaskStatus(params.id, body.status);
    return NextResponse.json(updated);
  } catch (err) {
    console.error(`PATCH /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session || session.role !== "Admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await deleteTask(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/tasks/${params.id} failed:`, err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
