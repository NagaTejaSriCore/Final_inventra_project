"use client";

import { useEffect, useState } from "react";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, Plus, Trash2, X } from "lucide-react";
import type { TaskItem, TaskPriority, TaskStatus } from "@/lib/hr-store";
import type { StaffMember } from "@/lib/types";

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "text-low bg-low/10",
  "in-progress": "text-primary bg-primary/10",
  completed: "text-healthy bg-healthy/10",
};

export function AdminTasksView() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    try {
      const [tRes, sRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/staff")]);
      if (tRes.ok) setTasks(await tRes.json());
      if (sRes.ok) setStaff(await sRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function removeTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  if (loading) return <p className="text-sm text-muted">Loading tasks…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending} icon={ListChecks} accent="low" />
        <StatCard label="In Progress" value={inProgress} icon={ListChecks} accent="primary" />
        <StatCard label="Completed" value={completed} icon={ListChecks} accent="healthy" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">All Tasks</h2>
        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Assign Task
        </Button>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && <Card className="p-6 text-sm text-muted">No tasks assigned yet.</Card>}
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-semibold">{task.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[task.status]}`}>{task.status}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                Assigned to {task.assignedToName} {task.dueDate && `· Due ${task.dueDate}`}
              </p>
            </div>
            <button
              onClick={() => removeTask(task.id)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-out/10 hover:text-out"
              aria-label="Delete task"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>

      {modalOpen && (
        <AssignTaskModal
          staff={staff}
          onClose={() => setModalOpen(false)}
          onCreated={(task) => {
            setTasks((prev) => [task, ...prev]);
            setModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AssignTaskModal({
  staff,
  onClose,
  onCreated,
}: {
  staff: StaffMember[];
  onClose: () => void;
  onCreated: (task: TaskItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const member = staff.find((s) => s.id === staffId);
    if (!title || !member) {
      setError("Title and assignee are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          assignedToStaffId: member.id,
          assignedToName: member.name,
          priority,
          dueDate,
        }),
      });
      if (!res.ok) {
        setError("Couldn't create the task.");
        return;
      }
      onCreated(await res.json());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Assign Task</h3>
          <button onClick={onClose} className="text-muted hover:text-text">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="min-h-[72px] w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="h-9 flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          {error && <p className="text-xs text-out">{error}</p>}
          <Button variant="primary" className="w-full" disabled={saving} onClick={submit}>
            {saving ? "Assigning…" : "Assign Task"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
