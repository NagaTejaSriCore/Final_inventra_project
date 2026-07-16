import { Topbar } from "@/components/topbar";
import { MyTasksView } from "@/components/staff/my-tasks-view";

export default function StaffTasksPage() {
  return (
    <>
      <Topbar title="My Tasks" />
      <main className="flex-1 p-4 md:p-6">
        <MyTasksView />
      </main>
    </>
  );
}
