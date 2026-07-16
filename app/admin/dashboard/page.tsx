import { Topbar } from "@/components/topbar";
import { StatCard, Card } from "@/components/ui/card";
import { HeroInsightPanel } from "@/components/dashboard/hero-insight-panel";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { ExpiryAlerts } from "@/components/dashboard/expiry-alerts";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AIPredictionWidget } from "@/components/dashboard/ai-prediction-widget";
import { FooterStats } from "@/components/dashboard/footer-stats";
import { InventoryHealthChart } from "@/components/charts/inventory-health-chart";
import { CategoryDonut } from "@/components/charts/category-donut";
import { WeeklyScanChart } from "@/components/charts/weekly-scan-chart";
import { StatusPill } from "@/components/ui/status-pill";
import { HealthRing } from "@/components/ui/health-ring";
import { kpis, products } from "@/lib/mock-data";
import { Boxes, PackageCheck, AlertTriangle, PackageX, CalendarClock, HeartPulse } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const recent = products.slice(0, 6);
  const expiredCount = products.filter((p) => p.status === "expired").length;
  const expiringCount = products.filter((p) => p.status === "expiring").length;
  const safeCount = products.filter((p) => p.status === "healthy").length;

  return (
    <>
      <Topbar title="Dashboard Overview" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        {/* Hero — AI health score, recommendation, and impact stats */}
        <HeroInsightPanel />

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Products" value={kpis.totalProducts.toLocaleString()} icon={Boxes} trend="+4.2% this month" trendUp accent="primary" />
          <StatCard label="Safe Products" value={safeCount * 12} icon={PackageCheck} trend="Within shelf life" trendUp accent="healthy" />
          <StatCard label="Expiring in 7 Days" value={kpis.expiringSoon} icon={CalendarClock} trend={`${expiringCount * 3} SKUs flagged`} accent="expiring" />
          <StatCard label="Expired Products" value={kpis.expired} icon={PackageX} trend="Needs disposal" accent="out" />
          <StatCard label="Low Stock" value={kpis.lowStock} icon={AlertTriangle} trend="6 need action" accent="low" />
          <StatCard label="Out of Stock" value={kpis.outOfStock} icon={PackageX} trend="-3 vs yesterday" trendUp accent="out" />
          <StatCard label="Restocked Today" value={kpis.restockedToday} icon={PackageCheck} trend="Across 4 warehouses" trendUp accent="healthy" />
          <StatCard label="Inventory Health" value={`${84}/100`} icon={HeartPulse} trend="Stable this week" trendUp accent="primary" />
        </div>

        {/* Expiry alerts */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Expiry Alerts</h2>
            <Link href="/admin/ai-insights" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ExpiryAlerts />
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold">Quick Actions</h2>
          <QuickActions />
        </div>

        {/* Analytics */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">Inventory Health</h2>
              <Link href="/admin/analytics" className="text-xs font-medium text-primary hover:underline">
                View analytics
              </Link>
            </div>
            <p className="mb-2 text-xs text-muted">Stock levels across all warehouses, last 7 months</p>
            <InventoryHealthChart />
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 font-display text-sm font-semibold">Product Categories</h2>
            <p className="mb-2 text-xs text-muted">Distribution by product count</p>
            <CategoryDonut />
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-1 font-display text-sm font-semibold">Weekly Scan Activity</h2>
            <p className="mb-2 text-xs text-muted">Barcode and OCR scans logged per day</p>
            <WeeklyScanChart />
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-display text-sm font-semibold">Recent Activity</h2>
            <ActivityTimeline />
          </Card>
        </div>

        {/* AI prediction */}
        <AIPredictionWidget />

        {/* Inventory summary table */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Recently Updated Products</h2>
            <Link href="/admin/products" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Batch</th>
                  <th className="pb-2 font-medium">Expiry Date</th>
                  <th className="pb-2 font-medium">Health</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2.5 pr-3 font-medium">{p.name}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">{p.sku}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-muted">{p.batch}</td>
                    <td className="py-2.5 pr-3 text-xs text-muted">{p.expiryDate}</td>
                    <td className="py-2.5 pr-3"><HealthRing score={p.healthScore} size={30} /></td>
                    <td className="py-2.5"><StatusPill status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer stats */}
        <FooterStats />
      </main>
    </>
  );
}
