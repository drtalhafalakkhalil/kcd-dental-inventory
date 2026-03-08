import { Route, Switch, Link, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Upload,
  BarChart3,
  Settings,
  Menu,
  X,
  ArrowRightLeft,
  GraduationCap,
  Users,
  LogOut,
  ShieldCheck,
  History,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorBoundary } from "./components/error-boundary";
import WelcomeDialog from "./components/welcome-dialog";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import InventoryList from "./pages/inventory-list";
import ExcelImport from "./pages/excel-import";
import StockMovements from "./pages/stock-movements";
import Reports from "./pages/reports";
import SettingsPage from "./pages/settings";
import UserManagement from "./pages/user-management";
import AuditTrail from "./pages/audit-trail";
import AccountSetup from "./pages/account-setup";
import ScanItem from "./pages/scan-item";
import NotFound from "./pages/not-found";

function RoleGuard({ children, allowed }: { children: ReactNode; allowed: boolean }) {
  if (!allowed) {
    return <Redirect to="/" />;
  }
  return <>{children}</>;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  chairman: "Chairman",
  faculty: "Faculty",
  clerk: "Clerk",
  lab_assistant: "Lab Assistant",
  student: "Student",
};

function AppLayout() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, isLoading, canManageUsers, canImportExcel, canRecordMovements } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Package className="w-12 h-12 text-cyan-600" />
          </motion.div>
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (location.startsWith("/scan")) {
    return (
      <>
        <ScanItem />
        <Toaster />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Login />
        <Toaster />
      </>
    );
  }

  if (user.mustChangePassword) {
    return (
      <>
        <AccountSetup />
        <Toaster />
      </>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard, show: true },
    { name: "Inventory", href: "/inventory", icon: Package, show: true },
    { name: "Stock Movements", href: "/movements", icon: ArrowRightLeft, show: canRecordMovements },
    { name: "Import Excel", href: "/import", icon: Upload, show: canImportExcel },
    { name: "Reports", href: "/reports", icon: BarChart3, show: true },
    { name: "Activity Log", href: "/audit", icon: History, show: canManageUsers },
    { name: "Users", href: "/users", icon: Users, show: canManageUsers },
    { name: "Settings", href: "/settings", icon: Settings, show: canManageUsers },
  ].filter(item => item.show);

  const userInitials = user.fullName
    ? user.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
    : user.username.substring(0, 2).toUpperCase();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <WelcomeDialog />
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <motion.aside
          initial={{ x: -300 }}
          animate={{ x: sidebarOpen ? 0 : -300 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 h-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white w-64 shadow-2xl z-50"
        >
          <div className="p-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight" data-testid="text-sidebar-title">KCD Inventory</h1>
                  <p className="text-xs text-gray-400">Dental Materials Dept.</p>
                </div>
              </div>
            </div>

            <nav className="space-y-1" data-testid="nav-sidebar">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <motion.a
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg"
                          : "text-gray-300 hover:bg-gray-800 hover:text-white"
                      }`}
                      data-testid={`link-nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="ml-auto w-2 h-2 bg-white rounded-full"
                        />
                      )}
                    </motion.a>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              <p className="font-semibold text-gray-300 mb-0.5" data-testid="text-sidebar-footer">Khyber College of Dentistry</p>
              <p>Dental Materials Department</p>
              <p className="mt-1 text-gray-500">&copy; 2026</p>
            </div>
          </div>
        </motion.aside>

        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-0"}`}>
          <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 justify-end" data-testid="text-user-name">
                  {user.isProtected && <ShieldCheck className="w-3.5 h-3.5 text-red-500" />}
                  {user.fullName || user.username}
                </p>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ROLE_LABELS[user.role] || user.role}
                </Badge>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                user.isProtected
                  ? "bg-gradient-to-br from-red-500 to-orange-500"
                  : "bg-gradient-to-br from-cyan-500 to-blue-600"
              }`}>
                {userInitials}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-500"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <main className="overflow-auto h-[calc(100vh-73px)]">
            <ErrorBoundary key={location} fallbackTitle="Page failed to load">
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/inventory" component={InventoryList} />
                <Route path="/movements">
                  <RoleGuard allowed={canRecordMovements}><StockMovements /></RoleGuard>
                </Route>
                <Route path="/import">
                  <RoleGuard allowed={canImportExcel}><ExcelImport /></RoleGuard>
                </Route>
                <Route path="/reports" component={Reports} />
                <Route path="/audit">
                  <RoleGuard allowed={canManageUsers}><AuditTrail /></RoleGuard>
                </Route>
                <Route path="/settings">
                  <RoleGuard allowed={canManageUsers}><SettingsPage /></RoleGuard>
                </Route>
                <Route path="/users">
                  <RoleGuard allowed={canManageUsers}><UserManagement /></RoleGuard>
                </Route>
                <Route component={NotFound} />
              </Switch>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
