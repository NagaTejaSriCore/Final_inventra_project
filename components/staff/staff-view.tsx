"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  CalendarClock,
  Users as UsersIcon,
  Clock,
  Phone,
} from "lucide-react";
import type { StaffMember, AttendanceRecord, AttendanceStatus } from "@/lib/types";
import { warehouses } from "@/lib/mock-data";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/lib/toast-context";

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-healthy/10 text-healthy",
  late: "bg-low/10 text-low",
  absent: "bg-out/10 text-out",
  "half-day": "bg-expiring/10 text-expiring",
  "on-leave": "bg-primary/10 text-primary",
};

const STAFF_STATUS_STYLE: Record<StaffMember["status"], string> = {
  active: "bg-healthy/10 text-healthy",
  "on-leave": "bg-low/10 text-low",
  inactive: "bg-out/10 text-out",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Date().toISOString();
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function StaffView() {
  const { showToast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const date = todayISO();

  async function loadAll() {
    setLoading(true);
    try {
      const [staffRes, todayRes, historyRes] = await Promise.all([
        fetch("/api/staff"),
        fetch(`/api/attendance?date=${date}`),
        fetch("/api/attendance"),
      ]);
      if (!staffRes.ok || !todayRes.ok || !historyRes.ok) throw new Error("load failed");
      setStaff(await staffRes.json());
      setTodayRecords(await todayRes.json());
      setHistory(await historyRes.json());
    } catch {
      setError("Couldn't load staff/attendance data from the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordFor = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of todayRecords) map.set(r.staffId, r);
    return map;
  }, [todayRecords]);

  const presentCount = todayRecords.filter((r) => r.status === "present" || r.status === "late" || r.status === "half-day").length;
  const absentCount = todayRecords.filter((r) => r.status === "absent").length;
  const onLeaveCount = staff.filter((s) => s.status === "on-leave").length;

  async function postAttendance(staffId: string, patch: Partial<AttendanceRecord>) {
    setBusyId(staffId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, date, ...patch }),
      });
      if (!res.ok) throw new Error("failed");
      const updated: AttendanceRecord = await res.json();
      setTodayRecords((prev) => {
        const exists = prev.some((r) => r.staffId === staffId);
        return exists ? prev.map((r) => (r.staffId === staffId ? updated : r)) : [updated, ...prev];
      });
      setHistory((prev) => {
        const exists = prev.some((r) => r.id === updated.id);
        return exists ? prev.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...prev];
      });
    } catch {
      showToast({ title: "Couldn't update attendance", description: "Please try again.", variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  async function checkIn(member: StaffMember) {
    const shiftStartMinutes = (() => {
      const [h, m] = member.shiftStart.split(":").map(Number);
      return h * 60 + (m || 0);
    })();
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const status: AttendanceStatus = nowMinutes > shiftStartMinutes + 15 ? "late" : "present";
    await postAttendance(member.id, { checkIn: timeNow(), status });
    showToast({ title: `${member.name} checked in`, variant: "success" });
  }

  async function checkOut(member: StaffMember) {
    const existing = recordFor.get(member.id);
    await postAttendance(member.id, { checkOut: timeNow(), status: existing?.status ?? "present" });
    showToast({ title: `${member.name} checked out`, variant: "success" });
  }

  async function markStatus(member: StaffMember, status: AttendanceStatus) {
    await postAttendance(member.id, { status, checkIn: null, checkOut: null });
    showToast({ title: `${member.name} marked ${status.replace("-", " ")}`, variant: "info" });
  }

  async function removeStaff(id: string) {
    const previous = staff;
    setStaff((prev) => prev.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("failed");
      showToast({ title: "Staff member removed", variant: "info" });
    } catch {
      setStaff(previous);
      showToast({ title: "Couldn't remove staff member", variant: "error" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Staff" value={staff.length} icon={UsersIcon} accent="primary" />
        <StatCard label="Present Today" value={presentCount} icon={UserCheck} accent="healthy" />
        <StatCard label="Absent Today" value={absentCount} icon={UserX} accent="out" />
        <StatCard label="On Leave" value={onLeaveCount} icon={CalendarClock} accent="low" />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold">Today's Attendance — {formatDate(date)}</h2>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={15} /> Add Staff
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-xs text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading staff…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((s) => {
            const record = recordFor.get(s.id);
            const status = record?.status;
            const busy = busyId === s.id;
            return (
              <Card key={s.id} className="p-4 transition-shadow hover:shadow-popover">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-semibold text-white"
                      style={{ backgroundColor: s.avatarColor }}
                    >
                      {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="truncate text-xs text-muted">{s.role}</p>
                    </div>
                  </div>
                  <button onClick={() => removeStaff(s.id)} className="rounded-md p-1.5 text-muted hover:bg-out/10 hover:text-out">
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-3 space-y-1 text-xs text-muted">
                  <p className="truncate">{s.department}</p>
                  <p className="flex items-center gap-1.5">
                    <Clock size={11} /> Shift {s.shiftStart} – {s.shiftEnd}
                  </p>
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone size={11} /> {s.phone}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STAFF_STATUS_STYLE[s.status])}>
                    {s.status.replace("-", " ")}
                  </span>
                  {status && (
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[status])}>
                      {status.replace("-", " ")}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                  <span>In: {formatTime(record?.checkIn ?? null)}</span>
                  <span>Out: {formatTime(record?.checkOut ?? null)}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  {!record?.checkIn ? (
                    <Button size="sm" variant="primary" className="flex-1" disabled={busy} onClick={() => checkIn(s)}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />} Check In
                    </Button>
                  ) : !record?.checkOut ? (
                    <Button size="sm" variant="secondary" className="flex-1" disabled={busy} onClick={() => checkOut(s)}>
                      {busy ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Check Out
                    </Button>
                  ) : (
                    <span className="flex-1 rounded-lg bg-surface2 px-3 py-1.5 text-center text-xs text-muted">Day complete</span>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => markStatus(s, "absent")}>
                    Absent
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => markStatus(s, "on-leave")}>
                    Leave
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold">Recent Attendance Log</h2>
        <Card className="overflow-hidden">
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface2">
                <tr className="text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Check In</th>
                  <th className="px-4 py-3 font-medium">Check Out</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted">
                      No attendance recorded yet — mark someone in above to get started.
                    </td>
                  </tr>
                )}
                {[...history]
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .slice(0, 30)
                  .map((r) => {
                    const member = staff.find((s) => s.id === r.staffId);
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-surface2/50">
                        <td className="px-4 py-3 font-medium">{member?.name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-xs">{formatDate(r.date)}</td>
                        <td className="px-4 py-3 text-xs">{formatTime(r.checkIn)}</td>
                        <td className="px-4 py-3 text-xs">{formatTime(r.checkOut)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[r.status])}>
                            {r.status.replace("-", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {modalOpen && (
        <AddStaffModal
          onClose={() => setModalOpen(false)}
          onCreated={(member) => {
            setStaff((prev) => [member, ...prev]);
            setModalOpen(false);
            showToast({ title: `${member.name} added to staff`, variant: "success" });
          }}
        />
      )}
    </div>
  );
}

function AddStaffModal({ onClose, onCreated }: { onClose: () => void; onCreated: (s: StaffMember) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState(warehouses[0]?.name ?? "");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const PALETTE = ["#3B82F6", "#22C55E", "#F59E0B", "#F97316", "#22C1C3", "#8B5CF6", "#EC4899"];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    setError(null);
    const payload = {
      id: `st-${Date.now()}`,
      name: name.trim(),
      role: role.trim(),
      department,
      phone,
      email,
      shiftStart,
      shiftEnd,
      status: "active" as const,
      joinDate: new Date().toISOString().slice(0, 10),
      avatarColor: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    };
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("failed");
      const created = await res.json();
      onCreated(created);
    } catch {
      setError("Couldn't add this staff member — please try again.");
      showToast({ title: "Couldn't add staff member", variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-xl2 border border-border bg-surface shadow-popover">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-sm font-semibold">Add Staff Member</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface2">
            <X size={16} />
          </button>
        </div>
        <form className="space-y-3 p-5" onSubmit={submit}>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-out/30 bg-out/10 px-3 py-2 text-xs text-out">
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block text-xs font-medium text-muted">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Role
              <input value={role} onChange={(e) => setRole(e.target.value)} required placeholder="e.g. Picker" className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Warehouse
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary">
                {warehouses.map((w) => (
                  <option key={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-muted">
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Shift start
              <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block text-xs font-medium text-muted">
              Shift end
              <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface2 px-3 text-sm outline-none focus:border-primary" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} Add staff member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
