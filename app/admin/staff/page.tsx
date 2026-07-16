import { Topbar } from "@/components/topbar";
import { StaffView } from "@/components/staff/staff-view";

export default function StaffPage() {
  return (
    <>
      <Topbar title="Staff & Attendance" />
      <main className="flex-1 p-4 md:p-6">
        <StaffView />
      </main>
    </>
  );
}
