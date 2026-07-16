"use client";

import { useEffect, useState } from "react";
import { Card, StatCard } from "@/components/ui/card";
import { ListChecks, Clock, CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { TaskItem, TaskStatus } from "@/lib/hr-store";

const STATUS_STYLE: Record<TaskStatus, string> = {
  pending: "text-low bg-low/10",
  "in-progress": "text-primary bg-primary/10",
  completed: "text-healthy bg-healthy/10",
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  pending: "in-progress",
  "in-progress": "completed",
  completed: null,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

export function MyTasksView() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) setTasks(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function advance(task: TaskItem) {
    const next = NEXT_STATUS[task.status];
    if (!next) return;
    setBusyId(task.id);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } finally {
      setBusyId(null);
    }
  }

  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in-progress").length;
  const completed = tasks.filter((t) => t.status === "completed").length;

  if (loading) return <p className="text-sm text-muted">Loading tasks…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Pending" value={pending} icon={Circle} accent="low" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} accent="primary" />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} accent="healthy" />
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && (
          <Card className="flex items-center gap-3 p-6 text-sm text-muted">
            <ListChecks size={18} /> No tasks have been assigned to you yet.
          </Card>
        )}
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-display text-sm font-semibold">{task.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[task.status]}`}>
                  {STATUS_LABEL[task.status]}
                </span>
              </div>
              {task.description && <p className="mt-1 text-xs text-muted">{task.description}</p>}
              {task.dueDate && <p className="mt-1 text-[11px] text-muted">Due {task.dueDate}</p>}
            </div>
            {NEXT_STATUS[task.status] && (
              <button
                onClick={() => advance(task)}
                disabled={busyId === task.id}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface2 px-3.5 text-sm font-medium text-text transition-colors hover:bg-border/60 disabled:opacity-50"
              >
                {busyId === task.id && <Loader2 size={14} className="animate-spin" />}
                Mark as {STATUS_LABEL[NEXT_STATUS[task.status]!]}
              </button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
