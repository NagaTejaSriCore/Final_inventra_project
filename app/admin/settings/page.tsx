import { Topbar } from "@/components/topbar";
import { SettingsView } from "@/components/settings/settings-view";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Settings" />
      <main className="flex-1 p-4 md:p-6">
        <SettingsView />
      </main>
    </>
  );
}
