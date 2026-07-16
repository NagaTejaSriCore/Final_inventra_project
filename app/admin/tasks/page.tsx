import { Topbar } from "@/components/topbar";
import { AdminTasksView } from "@/components/tasks/admin-tasks-view";

export default function AdminTasksPage() {
  return (
    <>
      <Topbar title="Task Management" />
      <main className="flex-1 p-4 md:p-6">
        <AdminTasksView />
      </main>
    </>
  );
}
