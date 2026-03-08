import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  Calendar,
  Grid3x3,
  Upload,
  Plus,
  BarChart3,
  TrendingUp,
  PackageOpen,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  ClipboardList,
  Sparkles,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import dentalHeroBanner from "@assets/generated_images/dental_hero_banner.png";
import dentalToothIcon from "@assets/generated_images/dental_tooth_icon.png";

interface DashboardStats {
  totalItems: number;
  totalValue: string;
  lowStockItems: number;
  expiringSoon: number;
  totalCategories: number;
  categoryBreakdown: Array<{ name: string; count: number }>;
  recentMovements: Array<{
    movement: {
      id: string;
      movementType: string;
      quantity: number;
      previousQuantity: number;
      newQuantity: number;
      reference: string | null;
      remarks: string | null;
      timestamp: string;
    };
    itemName: string;
    itemCode: string;
    userName: string;
  }>;
  movementStats: Array<{ type: string; count: number }>;
}

interface LowStockItem {
  item: {
    id: string;
    itemName: string;
    itemCode: string;
    quantity: number;
    minStockLevel: number;
  };
  categoryName: string;
}

interface ExpiringItem {
  item: {
    id: string;
    itemName: string;
    itemCode: string;
    expiryDate: string;
    quantity: number;
  };
  categoryName: string;
}

function FloatingParticle({ delay, x, size }: { delay: number; x: string; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/10"
      style={{ left: x, width: size, height: size }}
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: "-100%", opacity: [0, 0.6, 0] }}
      transition={{ duration: 8, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: lowStockItems = [] } = useQuery<LowStockItem[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const { data: expiringItems = [] } = useQuery<ExpiringItem[]>({
    queryKey: ["/api/inventory/expiring"],
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const statsCards = [
    {
      title: "Total Items",
      value: stats?.totalItems || 0,
      icon: Package,
      gradient: "from-cyan-500 to-blue-500",
      bgGlow: "bg-cyan-500/10",
      description: "Materials tracked",
      href: "/inventory",
    },
    {
      title: "Low Stock",
      value: stats?.lowStockItems || 0,
      icon: AlertTriangle,
      gradient: "from-orange-500 to-red-500",
      bgGlow: "bg-orange-500/10",
      description: "Need reorder",
      href: "/inventory",
    },
    {
      title: "Expiring Soon",
      value: stats?.expiringSoon || 0,
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500",
      bgGlow: "bg-purple-500/10",
      description: "Within 60 days",
      href: "/inventory",
    },
    {
      title: "Categories",
      value: stats?.totalCategories || 0,
      icon: Grid3x3,
      gradient: "from-emerald-500 to-teal-500",
      bgGlow: "bg-emerald-500/10",
      description: "Active groups",
      href: "/settings",
    },
  ];

  const chartColors = [
    "#0891B2", "#06B6D4", "#22D3EE", "#67E8F9",
    "#10B981", "#34D399", "#6366F1", "#8B5CF6",
    "#EC4899", "#F43F5E", "#F59E0B", "#FBBF24",
    "#14B8A6", "#3B82F6", "#A855F7", "#EF4444",
  ];

  const movementIcon = (type: string) => {
    switch (type) {
      case "receipt": return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case "issue": return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case "return": return <RotateCcw className="w-4 h-4 text-blue-500" />;
      case "adjustment": return <ClipboardList className="w-4 h-4 text-orange-500" />;
      default: return <ArrowRightLeft className="w-4 h-4 text-gray-500" />;
    }
  };

  const movementColor = (type: string) => {
    switch (type) {
      case "receipt": return "bg-green-50 text-green-700 border-green-200";
      case "issue": return "bg-red-50 text-red-700 border-red-200";
      case "return": return "bg-blue-50 text-blue-700 border-blue-200";
      case "adjustment": return "bg-orange-50 text-orange-700 border-orange-200";
      default: return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <PackageOpen className="w-12 h-12 text-cyan-600" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-gray-500"
          >
            Loading dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/40">
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(8, 145, 178, 0.15); }
          50% { box-shadow: 0 0 30px rgba(8, 145, 178, 0.3); }
        }
        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #a5f3fc 50%, #fff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        .card-glow:hover {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .hero-gradient {
          background: linear-gradient(135deg, #0e7490 0%, #0891b2 25%, #155e75 50%, #164e63 75%, #0e7490 100%);
          background-size: 300% 300%;
          animation: gradientShift 8s ease infinite;
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hero-gradient text-white relative overflow-hidden"
      >
        <FloatingParticle delay={0} x="10%" size={6} />
        <FloatingParticle delay={2} x="30%" size={4} />
        <FloatingParticle delay={4} x="60%" size={8} />
        <FloatingParticle delay={1} x="80%" size={5} />
        <FloatingParticle delay={3} x="45%" size={3} />
        <FloatingParticle delay={5} x="90%" size={6} />

        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: `url(${dentalHeroBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />

        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-300/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 py-10 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-6">
              <motion.div
                initial={{ scale: 0.9, x: -20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="flex-1"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                    Dental Materials Department
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight" data-testid="text-dashboard-title">
                  <span className="shimmer-text">Digital Inventory</span>
                  <br />
                  <span className="text-white/90">Dashboard</span>
                </h1>
                <p className="text-cyan-100/80 text-sm mt-3 max-w-md">
                  Khyber College of Dentistry — Real-time tracking of dental materials, supplies, and equipment.
                </p>

                <div className="flex flex-wrap gap-3 mt-5">
                  <Link href="/inventory?action=add">
                    <Button
                      className="bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 text-white shadow-lg transition-all duration-300"
                      data-testid="button-add-item"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </Link>
                  <Link href="/import">
                    <Button className="bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/20 text-white transition-all duration-300" data-testid="button-import-excel">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Excel
                    </Button>
                  </Link>
                  <Link href="/movements">
                    <Button className="bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/20 text-white transition-all duration-300" data-testid="button-record-movement">
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Record Movement
                    </Button>
                  </Link>
                  <Link href="/reports">
                    <Button className="bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/20 text-white transition-all duration-300" data-testid="button-view-reports">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Reports
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.3 }}
                className="hidden md:block shrink-0"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-2xl scale-110" />
                  <motion.img
                    src={dentalToothIcon}
                    alt="Dental"
                    className="w-36 h-36 relative z-10 drop-shadow-2xl"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute -top-2 -right-2 w-6 h-6"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-6 h-6 text-cyan-300" />
                  </motion.div>
                  <motion.div
                    className="absolute -bottom-1 -left-3 w-4 h-4"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  >
                    <Sparkles className="w-4 h-4 text-blue-300" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 -mt-6 relative z-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6"
        >
          {statsCards.map((stat) => (
            <motion.div key={stat.title} variants={itemVariants}>
              <Link href={stat.href}>
                <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-0 cursor-pointer group card-glow bg-white/80 backdrop-blur-sm" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  <div className={`h-1 bg-gradient-to-r ${stat.gradient}`} />
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardDescription className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                          {stat.title}
                        </CardDescription>
                        <CardTitle className="text-3xl font-extrabold mt-1 text-gray-900">
                          {stat.value}
                        </CardTitle>
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.15, rotate: 8 }}
                        className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}
                      >
                        <stat.icon className="w-5 h-5 text-white" />
                      </motion.div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card className="shadow-lg border-0 h-full bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-1.5 rounded-lg bg-cyan-50">
                        <BarChart3 className="w-4 h-4 text-cyan-600" />
                      </div>
                      Inventory by Category
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Distribution across {stats?.totalCategories || 0} categories
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stats?.categoryBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                    />
                    <YAxis tick={{ fill: "#6b7280" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.97)",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                        padding: "12px 16px",
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} animationDuration={1200}>
                      {stats?.categoryBreakdown?.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="shadow-lg border-0 h-full bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-1.5 rounded-lg bg-emerald-50">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  Category Share
                </CardTitle>
                <CardDescription className="mt-0.5">Top categories by items</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={stats.categoryBreakdown.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="count"
                        nameKey="name"
                        animationDuration={1200}
                        stroke="none"
                      >
                        {stats.categoryBreakdown.slice(0, 8).map((_, index) => (
                          <Cell key={`pie-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.97)",
                          border: "none",
                          borderRadius: "12px",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Card className="shadow-lg border-0 h-full bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-orange-400 to-red-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-orange-50">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                    </div>
                    Low Stock Alerts
                  </CardTitle>
                  <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 font-bold">
                    {lowStockItems.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {lowStockItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">All stock levels are healthy</p>
                    </div>
                  ) : (
                    lowStockItems.slice(0, 8).map((entry) => (
                      <motion.div
                        key={entry.item.id}
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-orange-50 to-transparent border border-orange-100/60"
                        data-testid={`alert-low-stock-${entry.item.id}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.item.itemName}</p>
                          <p className="text-xs text-gray-500">{entry.categoryName}</p>
                        </div>
                        <Badge className="bg-red-100 text-red-700 border-red-200 ml-2 shrink-0 font-bold text-xs">
                          {entry.item.quantity} left
                        </Badge>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-lg border-0 h-full bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-purple-400 to-pink-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-purple-50">
                      <Calendar className="w-4 h-4 text-purple-500" />
                    </div>
                    Expiring Soon
                  </CardTitle>
                  <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50 font-bold">
                    {expiringItems.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {expiringItems.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No items expiring soon</p>
                    </div>
                  ) : (
                    expiringItems.slice(0, 8).map((entry) => {
                      if (!entry.item.expiryDate) return null;
                      const expiryDate = new Date(entry.item.expiryDate);
                      if (isNaN(expiryDate.getTime())) return null;
                      const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpired = daysLeft < 0;
                      return (
                        <motion.div
                          key={entry.item.id}
                          whileHover={{ x: 2 }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border ${
                            isExpired ? "bg-gradient-to-r from-red-50 to-transparent border-red-100/60" : "bg-gradient-to-r from-purple-50 to-transparent border-purple-100/60"
                          }`}
                          data-testid={`alert-expiring-${entry.item.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{entry.item.itemName}</p>
                            <p className="text-xs text-gray-500">{expiryDate.toLocaleDateString()}</p>
                          </div>
                          <Badge className={`ml-2 shrink-0 font-bold text-xs ${isExpired ? "bg-red-100 text-red-700 border-red-200" : "bg-purple-100 text-purple-700 border-purple-200"}`}>
                            {isExpired ? "Expired" : `${daysLeft}d left`}
                          </Badge>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Card className="shadow-lg border-0 h-full bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="p-1.5 rounded-lg bg-blue-50">
                      <ArrowRightLeft className="w-4 h-4 text-blue-500" />
                    </div>
                    Recent Activity
                  </CardTitle>
                  <Link href="/movements">
                    <Button variant="ghost" size="sm" className="text-xs text-cyan-600 hover:text-cyan-700" data-testid="link-view-all-movements">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                  {!stats?.recentMovements || stats.recentMovements.length === 0 ? (
                    <div className="text-center py-8">
                      <ArrowRightLeft className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No recent activity</p>
                    </div>
                  ) : (
                    stats.recentMovements.slice(0, 8).map((entry) => (
                      <motion.div
                        key={entry.movement.id}
                        whileHover={{ x: 2 }}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-gray-50 to-transparent border border-gray-100/60"
                        data-testid={`activity-${entry.movement.id}`}
                      >
                        {movementIcon(entry.movement.movementType)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.itemName}</p>
                          <p className="text-xs text-gray-500">
                            {entry.movement.quantity} units &middot;{" "}
                            {new Date(entry.movement.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`text-xs border shrink-0 font-semibold ${movementColor(entry.movement.movementType)}`}>
                          {entry.movement.movementType}
                        </Badge>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-gray-100/60 mb-6"
        >
          <div className="flex items-center justify-between text-gray-600">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <p className="text-sm">
                <span className="font-semibold text-gray-900">System Active</span> &middot; Last
                updated: {new Date().toLocaleString()} &middot; {stats?.totalItems || 0} items
                tracked
              </p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">
              Dental Materials Department, KCD
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
