import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  History,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  RefreshCw,
  User,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  previousData: any;
  newData: any;
  userId: string | null;
  userDisplayName: string | null;
  timestamp: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  create: { label: "Created", color: "text-emerald-700", icon: Plus, bg: "bg-emerald-50 border-emerald-200" },
  update: { label: "Updated", color: "text-blue-700", icon: Pencil, bg: "bg-blue-50 border-blue-200" },
  delete: { label: "Deleted", color: "text-red-700", icon: Trash2, bg: "bg-red-50 border-red-200" },
  stock_change: { label: "Stock Changed", color: "text-amber-700", icon: ArrowUpDown, bg: "bg-amber-50 border-amber-200" },
  restore: { label: "Restored", color: "text-purple-700", icon: RotateCcw, bg: "bg-purple-50 border-purple-200" },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFullTime(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ChangeSummary({ log }: { log: AuditLog }) {
  const prev = log.previousData as any;
  const next = log.newData as any;

  if (log.action === "create" && next) {
    return (
      <p className="text-sm text-gray-600">
        Added <strong>{next.itemName}</strong> ({next.itemCode}) with quantity {next.quantity ?? "N/A"}
      </p>
    );
  }

  if (log.action === "delete" && prev) {
    return (
      <p className="text-sm text-gray-600">
        Removed <strong>{prev.itemName}</strong> ({prev.itemCode}) — had {prev.quantity ?? 0} units
      </p>
    );
  }

  if (log.action === "stock_change" && prev && next) {
    const direction = next.quantity > prev.quantity ? "increased" : "decreased";
    return (
      <p className="text-sm text-gray-600">
        <strong>{next.itemName}</strong> stock {direction} from{" "}
        <span className="font-semibold">{prev.quantity}</span> to{" "}
        <span className="font-semibold">{next.quantity}</span>{" "}
        ({next.movementType}: {next.changeAmount} units)
      </p>
    );
  }

  if (log.action === "update" && prev && next) {
    const changedKeys = Object.keys(next).filter(k => k !== "itemName" && k !== "itemCode");
    return (
      <div className="text-sm text-gray-600">
        <p>
          Updated <strong>{next.itemName || prev.itemName}</strong>
          {changedKeys.length > 0 && ":"}
        </p>
        {changedKeys.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs">
            {changedKeys.map(key => (
              <li key={key} className="text-gray-500">
                <span className="font-medium text-gray-700">{key}</span>:{" "}
                <span className="line-through text-red-400">{String(prev[key] ?? "—")}</span>{" "}
                → <span className="text-green-600">{String(next[key] ?? "—")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (log.action === "restore" && next) {
    return (
      <p className="text-sm text-gray-600">
        Restored <strong>{next.itemName}</strong> ({next.itemCode}) to a previous state
      </p>
    );
  }

  return <p className="text-sm text-gray-500 italic">Change details not available</p>;
}

export default function AuditTrail() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
  });

  const restoreMutation = useMutation({
    mutationFn: async (logId: string) => {
      const res = await apiRequest("POST", `/api/audit-logs/${logId}/restore`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Restored!", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setConfirmRestore(null);
    },
    onError: (err: any) => {
      toast({ title: "Restore Failed", description: err.message, variant: "destructive" });
      setConfirmRestore(null);
    },
  });

  const filteredLogs = filter === "all" ? logs : logs.filter(l => l.action === filter);

  const canRestore = (log: AuditLog) => {
    return hasRole("super_admin", "chairman") && (log.action === "delete" || log.action === "update" || log.action === "stock_change");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2" data-testid="text-audit-title">
            <History className="w-7 h-7 text-cyan-600" />
            Activity History
          </h1>
          <p className="text-sm text-gray-500 mt-1">Track all changes made to inventory — last 7 days</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] })}
          data-testid="button-refresh-audit"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "create", label: "Created" },
          { key: "update", label: "Updated" },
          { key: "delete", label: "Deleted" },
          { key: "stock_change", label: "Stock Changes" },
          { key: "restore", label: "Restores" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "bg-cyan-600 hover:bg-cyan-700" : ""}
            data-testid={`button-filter-${f.key}`}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="inline-block mb-4"
          >
            <Package className="w-10 h-10 text-cyan-600" />
          </motion.div>
          <p className="text-sm text-gray-500">Loading activity history...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No activity recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">Changes to inventory items will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-200" />

          <AnimatePresence>
            {filteredLogs.map((log, idx) => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
              const Icon = config.icon;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="relative pl-16 pb-4"
                >
                  <div className={`absolute left-5 top-2 w-7 h-7 rounded-full flex items-center justify-center border-2 bg-white ${config.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>

                  <Card className={`border ${config.bg} shadow-sm hover:shadow-md transition-shadow`} data-testid={`audit-entry-${log.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Badge variant="outline" className={`${config.color} border-current text-xs`}>
                              {config.label}
                            </Badge>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(log.timestamp)}
                            </span>
                          </div>

                          <ChangeSummary log={log} />

                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {log.userDisplayName || "System"}
                            </span>
                            <span title={formatFullTime(log.timestamp)}>
                              {formatFullTime(log.timestamp)}
                            </span>
                          </div>
                        </div>

                        {canRestore(log) && (
                          <div className="flex-shrink-0">
                            {confirmRestore === log.id ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => restoreMutation.mutate(log.id)}
                                  disabled={restoreMutation.isPending}
                                  data-testid={`button-confirm-restore-${log.id}`}
                                >
                                  {restoreMutation.isPending ? "Restoring..." : "Confirm"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmRestore(null)}
                                  data-testid={`button-cancel-restore-${log.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmRestore(log.id)}
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                data-testid={`button-restore-${log.id}`}
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                                Restore
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {hasRole("super_admin", "chairman") && filteredLogs.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium">Restore Tips</p>
            <p className="text-xs mt-1 text-amber-600">
              Click "Restore" on any update, delete, or stock change to revert the item back to its state before that change was made. Deleted items will be fully re-created. Logs are kept for 7 days.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
