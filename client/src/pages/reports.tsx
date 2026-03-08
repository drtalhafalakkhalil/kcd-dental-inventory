import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Package,
  AlertTriangle,
  Calendar,
  ArrowDownUp,
  Search,
  TrendingUp,
  DollarSign,
  Layers,
  Clock,
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
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryItem } from "@shared/schema";

interface ReportSummary {
  totalItems: number;
  totalValue: string;
  lowStockItems: number;
  expiringSoon: number;
  totalCategories: number;
  categoryBreakdown: Array<{ name: string; count: number }>;
  recentMovements: Array<{
    movement: {
      id: string;
      itemId: string;
      movementType: string;
      quantity: number;
      previousQuantity: number;
      newQuantity: number;
      reference: string | null;
      remarks: string | null;
      performedBy: string;
      timestamp: string;
    };
    itemName: string | null;
    itemCode: string | null;
    userName: string | null;
  }>;
  movementStats: Array<{ type: string; count: number }>;
}

interface InventoryItemWithCategory {
  item: InventoryItem;
  categoryName: string | null;
  categoryCode?: string | null;
}

interface MovementRecord {
  movement: {
    id: string;
    itemId: string;
    movementType: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reference: string | null;
    remarks: string | null;
    performedBy: string;
    timestamp: string;
  };
  itemName: string | null;
  itemCode: string | null;
  userName: string | null;
}

const chartColors = [
  "#0891B2", "#06B6D4", "#22D3EE", "#67E8F9",
  "#10B981", "#34D399", "#6366F1", "#8B5CF6",
  "#EC4899", "#F43F5E", "#F59E0B", "#FBBF24",
];

const pieColors = [
  "#0891B2", "#10B981", "#6366F1", "#EC4899",
  "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6",
  "#F97316", "#06B6D4", "#84CC16", "#A855F7",
];

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function movementTypeBadge(type: string) {
  const config: Record<string, { label: string; className: string }> = {
    receipt: { label: "Receipt", className: "bg-green-100 text-green-800 border-green-200" },
    issue: { label: "Issue", className: "bg-red-100 text-red-800 border-red-200" },
    adjustment: { label: "Adjustment", className: "bg-blue-100 text-blue-800 border-blue-200" },
    return: { label: "Return", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  };
  const c = config[type] || { label: type, className: "" };
  return <Badge variant="outline" className={c.className} data-testid={`badge-movement-type-${type}`}>{c.label}</Badge>;
}

export default function Reports() {
  const [movementFilter, setMovementFilter] = useState("all");
  const [movementSearch, setMovementSearch] = useState("");
  const [stockSearch, setStockSearch] = useState("");

  const { data: summary, isLoading: summaryLoading } = useQuery<ReportSummary>({
    queryKey: ["/api/reports/summary"],
  });

  const { data: allItems, isLoading: itemsLoading } = useQuery<InventoryItemWithCategory[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery<InventoryItemWithCategory[]>({
    queryKey: ["/api/inventory/low-stock"],
  });

  const { data: expiringItems, isLoading: expiringLoading } = useQuery<InventoryItemWithCategory[]>({
    queryKey: ["/api/inventory/expiring"],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery<MovementRecord[]>({
    queryKey: ["/api/movements"],
  });

  const filteredMovements = (movements || []).filter((m) => {
    const matchesType = movementFilter === "all" || m.movement.movementType === movementFilter;
    const searchLower = movementSearch.toLowerCase();
    const matchesSearch =
      !movementSearch ||
      (m.itemName || "").toLowerCase().includes(searchLower) ||
      (m.itemCode || "").toLowerCase().includes(searchLower) ||
      (m.movement.reference || "").toLowerCase().includes(searchLower);
    return matchesType && matchesSearch;
  });

  const filteredStockItems = (allItems || []).filter((i) => {
    const searchLower = stockSearch.toLowerCase();
    return (
      !stockSearch ||
      i.item.itemName.toLowerCase().includes(searchLower) ||
      i.item.itemCode.toLowerCase().includes(searchLower) ||
      i.item.folioNumber.toLowerCase().includes(searchLower)
    );
  });

  const totalValue = summary?.totalValue ? parseFloat(summary.totalValue) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-8 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3" data-testid="text-reports-title">
            <BarChart3 className="w-8 h-8" />
            Reports
          </h1>
          <p className="text-cyan-100 mt-1">Comprehensive inventory analytics and audit trail</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg" data-testid="card-stat-total-items">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardDescription className="text-xs font-medium">Total Items</CardDescription>
              <Package className="w-4 h-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-total-items">
                {summaryLoading ? <Skeleton className="h-9 w-16" /> : summary?.totalItems ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" data-testid="card-stat-total-value">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardDescription className="text-xs font-medium">Total Value</CardDescription>
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" data-testid="text-total-value">
                {summaryLoading ? <Skeleton className="h-9 w-24" /> : `Rs ${totalValue.toLocaleString()}`}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" data-testid="card-stat-low-stock">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardDescription className="text-xs font-medium">Low Stock</CardDescription>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600" data-testid="text-low-stock-count">
                {summaryLoading ? <Skeleton className="h-9 w-12" /> : summary?.lowStockItems ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg" data-testid="card-stat-expiring">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardDescription className="text-xs font-medium">Expiring Soon</CardDescription>
              <Calendar className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600" data-testid="text-expiring-count">
                {summaryLoading ? <Skeleton className="h-9 w-12" /> : summary?.expiringSoon ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="bg-white shadow-md" data-testid="tabs-reports">
            <TabsTrigger value="summary" data-testid="tab-summary">
              <Layers className="w-4 h-4 mr-1" /> Summary
            </TabsTrigger>
            <TabsTrigger value="stock" data-testid="tab-stock">
              <Package className="w-4 h-4 mr-1" /> Stock
            </TabsTrigger>
            <TabsTrigger value="lowstock" data-testid="tab-lowstock">
              <AlertTriangle className="w-4 h-4 mr-1" /> Low Stock
            </TabsTrigger>
            <TabsTrigger value="expiry" data-testid="tab-expiry">
              <Calendar className="w-4 h-4 mr-1" /> Expiry
            </TabsTrigger>
            <TabsTrigger value="movements" data-testid="tab-movements">
              <ArrowDownUp className="w-4 h-4 mr-1" /> Movements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg" data-testid="card-category-chart">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-600" />
                    Items by Category
                  </CardTitle>
                  <CardDescription>Distribution of inventory items across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={summary?.categoryBreakdown || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          angle={-35}
                          textAnchor="end"
                          height={80}
                          tick={{ fill: "#6b7280", fontSize: 11 }}
                        />
                        <YAxis tick={{ fill: "#6b7280" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.95)",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {(summary?.categoryBreakdown || []).map((_, idx) => (
                            <Cell key={`bar-${idx}`} fill={chartColors[idx % chartColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg" data-testid="card-category-pie">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-600" />
                    Category Distribution
                  </CardTitle>
                  <CardDescription>Percentage share of each category</CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={summary?.categoryBreakdown || []}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            paddingAngle={2}
                            stroke="none"
                          >
                            {(summary?.categoryBreakdown || []).map((_, idx) => (
                              <Cell key={`pie-${idx}`} fill={pieColors[idx % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(255,255,255,0.97)",
                              border: "none",
                              borderRadius: "10px",
                              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                              padding: "8px 14px",
                            }}
                            formatter={(value: number, name: string) => [`${value} items`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 max-h-[140px] overflow-y-auto pr-1">
                        {(summary?.categoryBreakdown || []).map((cat, idx) => {
                          const total = (summary?.categoryBreakdown || []).reduce((s, c) => s + c.count, 0);
                          const pct = total > 0 ? ((cat.count / total) * 100).toFixed(0) : "0";
                          return (
                            <div key={cat.name} className="flex items-center gap-2 text-xs py-0.5">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: pieColors[idx % pieColors.length] }}
                              />
                              <span className="text-gray-700 truncate flex-1">{cat.name}</span>
                              <span className="text-gray-400 shrink-0 tabular-nums">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg lg:col-span-2" data-testid="card-movement-stats">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownUp className="w-5 h-5 text-cyan-600" />
                    Movement Summary
                  </CardTitle>
                  <CardDescription>Breakdown of inventory movements by type</CardDescription>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <Skeleton className="h-[200px] w-full" />
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(summary?.movementStats || []).map((stat) => {
                        const config: Record<string, { color: string; icon: typeof Package }> = {
                          receipt: { color: "text-green-600", icon: TrendingUp },
                          issue: { color: "text-red-600", icon: Package },
                          adjustment: { color: "text-blue-600", icon: Layers },
                          return: { color: "text-yellow-600", icon: ArrowDownUp },
                        };
                        const c = config[stat.type] || { color: "text-gray-600", icon: Package };
                        const Icon = c.icon;
                        return (
                          <div
                            key={stat.type}
                            className="flex flex-col items-center p-4 bg-gray-50 rounded-md"
                            data-testid={`stat-movement-${stat.type}`}
                          >
                            <Icon className={`w-6 h-6 ${c.color} mb-2`} />
                            <span className="text-2xl font-bold">{stat.count}</span>
                            <span className="text-sm text-gray-500 capitalize">{stat.type}s</span>
                          </div>
                        );
                      })}
                      {(!summary?.movementStats || summary.movementStats.length === 0) && (
                        <p className="col-span-4 text-center text-gray-400 py-8">No movements recorded yet</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stock">
            <Card className="border-0 shadow-lg" data-testid="card-stock-report">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-cyan-600" />
                      Stock Summary Report
                    </CardTitle>
                    <CardDescription>All inventory items with quantities and values</CardDescription>
                  </div>
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search items..."
                      className="pl-9"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      data-testid="input-stock-search"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Folio No.</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Min Stock</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total Value</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStockItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-gray-400 py-8">
                              No items found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredStockItems.map((entry) => {
                            const unitPrice = entry.item.unitPrice ? parseFloat(entry.item.unitPrice) : 0;
                            const totalVal = unitPrice * entry.item.quantity;
                            const isLow = entry.item.quantity <= (entry.item.minStockLevel || 0);
                            return (
                              <TableRow key={entry.item.id} data-testid={`row-stock-${entry.item.id}`}>
                                <TableCell className="font-mono text-sm">{entry.item.itemCode}</TableCell>
                                <TableCell className="font-medium">{entry.item.itemName}</TableCell>
                                <TableCell>{entry.categoryName || "—"}</TableCell>
                                <TableCell>{entry.item.folioNumber}</TableCell>
                                <TableCell className="text-right font-medium">{entry.item.quantity}</TableCell>
                                <TableCell className="text-right">{entry.item.minStockLevel ?? "—"}</TableCell>
                                <TableCell className="text-right">{unitPrice ? `Rs ${unitPrice.toLocaleString()}` : "—"}</TableCell>
                                <TableCell className="text-right">{totalVal ? `Rs ${totalVal.toLocaleString()}` : "—"}</TableCell>
                                <TableCell>
                                  {isLow ? (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Low</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">OK</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                    {filteredStockItems.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                        <span data-testid="text-stock-count">{filteredStockItems.length} items displayed</span>
                        <span className="font-medium" data-testid="text-stock-total-value">
                          Total Value: Rs{" "}
                          {filteredStockItems
                            .reduce((sum, e) => {
                              const up = e.item.unitPrice ? parseFloat(e.item.unitPrice) : 0;
                              return sum + up * e.item.quantity;
                            }, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lowstock">
            <Card className="border-0 shadow-lg" data-testid="card-lowstock-report">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Low Stock Report
                </CardTitle>
                <CardDescription>Items at or below their minimum stock level</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockLoading ? (
                  <LoadingSkeleton />
                ) : (lowStockItems || []).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No low stock items found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Current Qty</TableHead>
                          <TableHead className="text-right">Min Stock</TableHead>
                          <TableHead className="text-right">Deficit</TableHead>
                          <TableHead>Severity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(lowStockItems || []).map((entry) => {
                          const deficit = (entry.item.minStockLevel || 0) - entry.item.quantity;
                          const isZero = entry.item.quantity === 0;
                          return (
                            <TableRow key={entry.item.id} data-testid={`row-lowstock-${entry.item.id}`}>
                              <TableCell className="font-mono text-sm">{entry.item.itemCode}</TableCell>
                              <TableCell className="font-medium">{entry.item.itemName}</TableCell>
                              <TableCell>{entry.categoryName || "—"}</TableCell>
                              <TableCell className="text-right font-medium">{entry.item.quantity}</TableCell>
                              <TableCell className="text-right">{entry.item.minStockLevel ?? "—"}</TableCell>
                              <TableCell className="text-right text-red-600 font-medium">{deficit > 0 ? `-${deficit}` : "0"}</TableCell>
                              <TableCell>
                                {isZero ? (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Out of Stock</Badge>
                                ) : deficit > (entry.item.minStockLevel || 0) / 2 ? (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Critical</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">Warning</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-orange-50 rounded-md text-sm text-orange-700" data-testid="text-lowstock-summary">
                      {(lowStockItems || []).length} items need attention.{" "}
                      {(lowStockItems || []).filter((i) => i.item.quantity === 0).length} items are completely out of stock.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiry">
            <Card className="border-0 shadow-lg" data-testid="card-expiry-report">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  Expiry Report
                </CardTitle>
                <CardDescription>Items expiring within 90 days or already expired</CardDescription>
              </CardHeader>
              <CardContent>
                {expiringLoading ? (
                  <LoadingSkeleton />
                ) : (expiringItems || []).length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No items expiring soon</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Code</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Batch No.</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(expiringItems || []).map((entry) => {
                          const now = new Date();
                          const expDate = entry.item.expiryDate ? new Date(entry.item.expiryDate) : null;
                          const isExpired = expDate && expDate < now;
                          const daysLeft = expDate ? Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
                          return (
                            <TableRow key={entry.item.id} data-testid={`row-expiry-${entry.item.id}`}>
                              <TableCell className="font-mono text-sm">{entry.item.itemCode}</TableCell>
                              <TableCell className="font-medium">{entry.item.itemName}</TableCell>
                              <TableCell>{entry.categoryName || "—"}</TableCell>
                              <TableCell>{entry.item.batchNumber || "—"}</TableCell>
                              <TableCell>
                                {expDate ? expDate.toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-right">{entry.item.quantity}</TableCell>
                              <TableCell>
                                {isExpired ? (
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Expired</Badge>
                                ) : daysLeft !== null && daysLeft <= 30 ? (
                                  <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">{daysLeft}d left</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">{daysLeft}d left</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-purple-50 rounded-md text-sm text-purple-700" data-testid="text-expiry-summary">
                      {(expiringItems || []).filter((i) => {
                        const d = i.item.expiryDate ? new Date(i.item.expiryDate) : null;
                        return d && d < new Date();
                      }).length}{" "}
                      items already expired.{" "}
                      {(expiringItems || []).filter((i) => {
                        const d = i.item.expiryDate ? new Date(i.item.expiryDate) : null;
                        return d && d >= new Date();
                      }).length}{" "}
                      items expiring soon.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements">
            <Card className="border-0 shadow-lg" data-testid="card-movements-report">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-600" />
                      Movement History
                    </CardTitle>
                    <CardDescription>Complete audit trail of all inventory movements</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search movements..."
                        className="pl-9"
                        value={movementSearch}
                        onChange={(e) => setMovementSearch(e.target.value)}
                        data-testid="input-movement-search"
                      />
                    </div>
                    <Select value={movementFilter} onValueChange={setMovementFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-movement-filter">
                        <SelectValue placeholder="Filter type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="receipt">Receipt</SelectItem>
                        <SelectItem value="issue">Issue</SelectItem>
                        <SelectItem value="adjustment">Adjustment</SelectItem>
                        <SelectItem value="return">Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {movementsLoading ? (
                  <LoadingSkeleton />
                ) : filteredMovements.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ArrowDownUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No movements found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Before</TableHead>
                          <TableHead className="text-right">After</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead>By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMovements.map((m) => (
                          <TableRow key={m.movement.id} data-testid={`row-movement-${m.movement.id}`}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(m.movement.timestamp).toLocaleDateString()}{" "}
                              <span className="text-gray-400">
                                {new Date(m.movement.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{m.itemName || "—"}</div>
                              <div className="text-xs text-gray-400 font-mono">{m.itemCode || ""}</div>
                            </TableCell>
                            <TableCell>{movementTypeBadge(m.movement.movementType)}</TableCell>
                            <TableCell className="text-right font-medium">{m.movement.quantity}</TableCell>
                            <TableCell className="text-right">{m.movement.previousQuantity}</TableCell>
                            <TableCell className="text-right">{m.movement.newQuantity}</TableCell>
                            <TableCell className="text-sm">{m.movement.reference || "—"}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{m.movement.remarks || "—"}</TableCell>
                            <TableCell className="text-sm">{m.userName || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-600" data-testid="text-movements-count">
                      Showing {filteredMovements.length} of {(movements || []).length} movements
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
