"use client";

import { useEffect, useState } from "react";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Clock, History } from "lucide-react";
import type { AttendanceRecord, AttendanceStatus } from "@/lib/types";

interface StaffLink {
  id: string;
  name: string;
}

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "text-healthy bg-healthy/10",
  absent: "text-out bg-out/10",
  late: "text-low bg-low/10",
  "half-day": "text-primary bg-primary/10",
  "on-leave": "text-muted bg-surface2",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timeNow() {
  return new Date().toTimeString().slice(0, 5);
}

function workingHours(record?: AttendanceRecord | null): string {
  if (!record?.checkIn) return "—";
  const [inH, inM] = record.checkIn.split(":").map(Number);
  const end = record.checkOut ? record.checkOut.split(":").map(Number) : new Date().toTimeString().slice(0, 5).split(":").map(Number);
  const minutes = end[0] * 60 + end[1] - (inH * 60 + inM);
  if (minutes <= 0) return "—";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function MyAttendanceView() {
  const [staff, setStaff] = useState<StaffLink | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const meRes = await fetch("/api/me/staff");
      const me = await meRes.json();
      if (!me.staff) {
        setError("Your account isn't linked to a staff roster record yet — ask an admin to add you under Staff Management with the same email you log in with.");
        setLoading(false);
        return;
      }
      setStaff(me.staff);
      const res = await fetch("/api/attendance");
      const all: AttendanceRecord[] = await res.json();
      setHistory(all.filter((r) => r.staffId === me.staff.id).sort((a, b) => (a.date < b.date ? 1 : -1)));
    } catch {
      setError("Couldn't load attendance right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const today = history.find((r) => r.date === todayISO()) ?? null;

  async function checkIn() {
    if (!staff) return;
    setBusy(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, date: todayISO(), checkIn: timeNow(), status: "present" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    if (!staff) return;
    setBusy(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: staff.id, date: todayISO(), checkOut: timeNow(), status: today?.status ?? "present" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading attendance…</p>;
  if (error) return <Card className="p-5 text-sm text-muted">{error}</Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Today's Status" value={today?.status ?? "Not checked in"} icon={Clock} accent="primary" />
        <StatCard label="Check In" value={today?.checkIn ?? "—"} icon={LogIn} accent="healthy" />
        <StatCard label="Working Hours" value={workingHours(today)} icon={History} accent="low" />
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-5">
        <Button variant="primary" disabled={busy || !!today?.checkIn} onClick={checkIn}>
          <LogIn size={15} /> Check In
        </Button>
        <Button variant="secondary" disabled={busy || !today?.checkIn || !!today?.checkOut} onClick={checkOut}>
          <LogOut size={15} /> Check Out
        </Button>
        {today?.checkOut && <span className="text-xs text-muted">You've checked out for today.</span>}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-sm font-semibold">Attendance History</h2>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Check In</th>
                <th className="px-4 py-2.5 font-medium">Check Out</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted">
                    No attendance history yet.
                  </td>
                </tr>
              )}
              {history.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 text-muted">{r.checkIn ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{r.checkOut ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
