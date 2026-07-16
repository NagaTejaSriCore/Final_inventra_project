import { Topbar } from "@/components/topbar";
import { ScanWorkflow } from "@/components/products/scan-workflow";

export default function ScanPage() {
  return (
    <>
      <Topbar title="AI Product Scanner" />
      <main className="flex-1 p-4 md:p-6">
        <ScanWorkflow />
      </main>
    </>
  );
}
