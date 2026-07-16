import { Topbar } from "@/components/topbar";
import { Card } from "@/components/ui/card";
import { InventoryHealthChart } from "@/components/charts/inventory-health-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { WarehouseBar } from "@/components/charts/warehouse-bar";
import { ExpiryTimelineChart } from "@/components/charts/expiry-timeline-chart";
import { ProductMovementChart } from "@/components/charts/product-movement-chart";

export default function AnalyticsPage() {
  return (
    <>
      <Topbar title="Inventory Analytics" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="font-display text-sm font-semibold">Inventory Health Trend</h2>
            <p className="mb-1 text-xs text-muted">In stock vs. low stock vs. out of stock, last 7 months</p>
            <InventoryHealthChart />
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold">Product Categories</h2>
            <p className="mb-1 text-xs text-muted">Share of total product count</p>
            <CategoryDonut />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold">Warehouse Distribution</h2>
            <p className="mb-1 text-xs text-muted">Capacity utilization by site</p>
            <WarehouseBar />
          </Card>
          <Card className="p-5">
            <h2 className="font-display text-sm font-semibold">Product Movement</h2>
            <p className="mb-1 text-xs text-muted">Inbound vs. outbound units, last 7 days</p>
            <ProductMovementChart />
          </Card>
        </div>

        <Card className="p-5">
          <h2 className="font-display text-sm font-semibold">Expiry Timeline</h2>
          <p className="mb-1 text-xs text-muted">Products approaching expiry, grouped by week</p>
          <ExpiryTimelineChart />
        </Card>
      </main>
    </>
  );
}
