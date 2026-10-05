import type { Metadata } from "next";
import AppNavigation from "@/components/AppNavigation";
import DashboardTopBar from "@/components/DashboardTopBar";
import { dashboardContext } from "./dashboard-context";
export const metadata: Metadata = { title: "Ruangmu", robots: { index: false, follow: false } };
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { name, avatar, status } = await dashboardContext();
  return <div className="dashboard-shell"><AppNavigation /><div className="dashboard-workspace"><DashboardTopBar name={name} avatar={avatar} status={status} /><main className="dashboard-main">{children}</main></div></div>;
}
