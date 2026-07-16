import { Topbar } from "@/components/topbar";
import { MyAttendanceView } from "@/components/staff/my-attendance-view";

export default function StaffAttendancePage() {
  return (
    <>
      <Topbar title="Attendance" />
      <main className="flex-1 p-4 md:p-6">
        <MyAttendanceView />
      </main>
    </>
  );
}
