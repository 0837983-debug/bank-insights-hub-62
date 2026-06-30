import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background" data-testid="app-shell">
      <Header />
      <Outlet />
    </div>
  );
}
