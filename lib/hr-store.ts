import { sql } from "./pg";

// ---------------------------------------------------------------------------
// Task Management + Leave Management + the auth-user <-> staff-record link.
//
// These are brand new tables (tasks, leave_requests) — nothing here alters
// the existing `staff`, `attendance`, or any inventory/product table. This
// module is additive only, per the "do not modify locked modules" rule.
//
// Linking a logged-in user to "their" staff row: auth_users and staff are
// separate tables (auth_users is for login, staff is the HR roster). We
// link them by email, which is the only field both sides share.
// ---------------------------------------------------------------------------

export type TaskStatus = "pending" | "in-progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignedToStaffId: string;
  assignedToName: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
  createdAt: string;
}

let schemaReady: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema() {
  await sql`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    "assignedToStaffId" TEXT NOT NULL,
    "assignedToName" TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    "dueDate" TEXT,
    "createdAt" TEXT NOT NULL
  )`;

  await sql`CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TEXT NOT NULL
  )`;
}

// --- staff lookup by email (read-only against the existing staff table) ---
export async function findStaffByEmail(email: string): Promise<{ id: string; name: string } | null> {
  const rows = (await sql`SELECT id, name FROM staff WHERE LOWER(email) = ${email.trim().toLowerCase()} LIMIT 1`) as {
    id: string;
    name: string;
  }[];
  return rows[0] ?? null;
}

// --- tasks ---
export async function listTasks(staffId?: string): Promise<TaskItem[]> {
  await ready();
  if (staffId) {
    return (await sql`SELECT * FROM tasks WHERE "assignedToStaffId" = ${staffId} ORDER BY "createdAt" DESC`) as TaskItem[];
  }
  return (await sql`SELECT * FROM tasks ORDER BY "createdAt" DESC`) as TaskItem[];
}

export async function createTask(input: Omit<TaskItem, "id" | "createdAt" | "status"> & { status?: TaskStatus }): Promise<TaskItem> {
  await ready();
  const task: TaskItem = {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title,
    description: input.description ?? "",
    assignedToStaffId: input.assignedToStaffId,
    assignedToName: input.assignedToName,
    priority: input.priority ?? "medium",
    status: input.status ?? "pending",
    dueDate: input.dueDate,
    createdAt: new Date().toISOString(),
  };
  await sql`
    INSERT INTO tasks (id, title, description, "assignedToStaffId", "assignedToName", priority, status, "dueDate", "createdAt")
    VALUES (${task.id}, ${task.title}, ${task.description}, ${task.assignedToStaffId}, ${task.assignedToName}, ${task.priority}, ${task.status}, ${task.dueDate}, ${task.createdAt})
  `;
  return task;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<TaskItem | null> {
  await ready();
  const rows = (await sql`UPDATE tasks SET status = ${status} WHERE id = ${id} RETURNING *`) as TaskItem[];
  return rows[0] ?? null;
}

export async function updateTask(id: string, patch: Partial<Omit<TaskItem, "id" | "createdAt">>): Promise<TaskItem | null> {
  await ready();
  const existingRows = (await sql`SELECT * FROM tasks WHERE id = ${id}`) as TaskItem[];
  const existing = existingRows[0];
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const rows = (await sql`
    UPDATE tasks SET title = ${merged.title}, description = ${merged.description}, "assignedToStaffId" = ${merged.assignedToStaffId},
      "assignedToName" = ${merged.assignedToName}, priority = ${merged.priority}, status = ${merged.status}, "dueDate" = ${merged.dueDate}
    WHERE id = ${id} RETURNING *
  `) as TaskItem[];
  return rows[0] ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM tasks WHERE id = ${id}`;
}

// --- leave requests ---
export async function listLeaveRequests(staffId?: string): Promise<LeaveRequest[]> {
  await ready();
  if (staffId) {
    return (await sql`SELECT * FROM leave_requests WHERE "staffId" = ${staffId} ORDER BY "createdAt" DESC`) as LeaveRequest[];
  }
  return (await sql`SELECT * FROM leave_requests ORDER BY "createdAt" DESC`) as LeaveRequest[];
}

export async function createLeaveRequest(input: Omit<LeaveRequest, "id" | "createdAt" | "status">): Promise<LeaveRequest> {
  await ready();
  const req: LeaveRequest = {
    id: `leave-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    staffId: input.staffId,
    staffName: input.staffName,
    fromDate: input.fromDate,
    toDate: input.toDate,
    reason: input.reason,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await sql`
    INSERT INTO leave_requests (id, "staffId", "staffName", "fromDate", "toDate", reason, status, "createdAt")
    VALUES (${req.id}, ${req.staffId}, ${req.staffName}, ${req.fromDate}, ${req.toDate}, ${req.reason}, ${req.status}, ${req.createdAt})
  `;
  return req;
}

export async function updateLeaveStatus(id: string, status: LeaveStatus): Promise<LeaveRequest | null> {
  await ready();
  const rows = (await sql`UPDATE leave_requests SET status = ${status} WHERE id = ${id} RETURNING *`) as LeaveRequest[];
  return rows[0] ?? null;
}
