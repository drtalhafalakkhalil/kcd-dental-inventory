import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  RotateCcw,
  MapPin,
  Calendar,
  Tag,
  Hash,
  Loader2,
  PackagePlus,
  PackageMinus,
  GraduationCap,
  Clock,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MovementRecord {
  id: string;
  movementType: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  performedBy: string;
  reference: string | null;
  remarks: string | null;
  timestamp: string;
}

interface ScanItemData {
  item: {
    id: string;
    itemCode: string;
    folioNumber: string;
    itemName: string;
    categoryId: string;
    quantity: number;
    unit: string;
    minStockLevel: number | null;
    unitPrice: string | null;
    expiryApplicable: boolean;
    expiryDate: string | null;
    batchNumber: string | null;
    supplier: string | null;
    location: string | null;
    notes: string | null;
    qrCode: string;
  };
  categoryName: string;
  categoryCode: string;
  recentMovements: MovementRecord[];
}

const MOVEMENT_ICONS: Record<string, typeof ArrowDownCircle> = {
  receipt: ArrowDownCircle,
  issue: ArrowUpCircle,
  return: RotateCcw,
  adjustment: Package,
};

const MOVEMENT_COLORS: Record<string, string> = {
  receipt: "text-green-600",
  issue: "text-red-600",
  return: "text-blue-600",
  adjustment: "text-purple-600",
};

export default function ScanItem() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const code = params.get("code");
  const folio = params.get("folio");

  const { user, canRecordMovements } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ScanItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showRestock, setShowRestock] = useState(false);
  const [showIssue, setShowIssue] = useState(false);
  const [actionQty, setActionQty] = useState("");
  const [actionRef, setActionRef] = useState("");
  const [actionRemarks, setActionRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchItem = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParam = code ? `code=${encodeURIComponent(code)}` : `folio=${encodeURIComponent(folio!)}`;
      const res = await fetch(`/api/inventory/lookup?${queryParam}`, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Item not found");
      }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || "Failed to load item");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code || folio) {
      fetchItem();
    } else {
      setLoading(false);
      setError("No item code or folio number provided. Please scan a valid QR code.");
    }
  }, [code, folio]);

  const resetActionForm = () => {
    setActionQty("");
    setActionRef("");
    setActionRemarks("");
  };

  const handleAction = async (movementType: string) => {
    if (!data || !actionQty || !user) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/movements", {
        itemId: data.item.id,
        movementType,
        quantity: parseInt(actionQty),
        reference: actionRef || null,
        remarks: actionRemarks || null,
        performedBy: user.id,
      });
      toast({
        title: movementType === "receipt" ? "Stock Received" : "Stock Issued",
        description: `${actionQty} ${data.item.unit}(s) ${movementType === "receipt" ? "added to" : "issued from"} ${data.item.itemName}`,
      });
      resetActionForm();
      setShowRestock(false);
      setShowIssue(false);
      await fetchItem();
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const item = data?.item;
  const isLowStock = item && item.minStockLevel ? item.quantity <= item.minStockLevel : false;
  const isOutOfStock = item ? item.quantity === 0 : false;
  const isExpiring = item?.expiryApplicable && item.expiryDate
    ? new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    : false;
  const isExpired = item?.expiryApplicable && item.expiryDate
    ? new Date(item.expiryDate) < new Date()
    : false;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Looking up item...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" data-testid="text-scan-error">Item Not Found</h1>
          <p className="text-gray-500 mb-6">{error || "The scanned QR code doesn't match any item in inventory."}</p>
          <Button onClick={() => window.location.href = "/"} variant="outline" data-testid="button-go-home">
            Go to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className={`py-6 px-4 shadow-lg ${
        isOutOfStock
          ? "bg-gradient-to-r from-red-600 to-red-700"
          : isLowStock
            ? "bg-gradient-to-r from-amber-500 to-orange-600"
            : "bg-gradient-to-r from-cyan-600 to-blue-600"
      } text-white`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <GraduationCap className="w-4 h-4" />
            <span className="text-xs font-medium">KCD Dental Materials</span>
          </div>
          <h1 className="text-2xl font-bold leading-tight mb-1" data-testid="text-scan-item-name">
            {item!.itemName}
          </h1>
          <div className="flex items-center gap-3 text-sm opacity-90">
            <span className="flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              {item!.itemCode}
            </span>
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              {data.categoryName}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-xl mb-4">
            <CardContent className="p-5">
              <div className="text-center mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Stock</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={`text-5xl font-black ${
                    isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-gray-900"
                  }`} data-testid="text-scan-quantity">
                    {item!.quantity}
                  </span>
                  <span className="text-lg text-gray-400 font-medium">{item!.unit}(s)</span>
                </div>
                {isOutOfStock && (
                  <Badge className="mt-2 bg-red-100 text-red-700 border-red-200" data-testid="badge-out-of-stock">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Out of Stock
                  </Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge className="mt-2 bg-amber-100 text-amber-700 border-amber-200" data-testid="badge-low-stock">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock (min: {item!.minStockLevel})
                  </Badge>
                )}
                {!isLowStock && !isOutOfStock && (
                  <Badge className="mt-2 bg-green-100 text-green-700 border-green-200" data-testid="badge-in-stock">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> In Stock
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-0.5">Folio Number</p>
                  <p className="font-semibold text-gray-800">{item!.folioNumber}</p>
                </div>
                {item!.location && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                    <p className="font-semibold text-gray-800">{item!.location}</p>
                  </div>
                )}
                {item!.supplier && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Supplier</p>
                    <p className="font-semibold text-gray-800">{item!.supplier}</p>
                  </div>
                )}
                {item!.batchNumber && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Batch</p>
                    <p className="font-semibold text-gray-800">{item!.batchNumber}</p>
                  </div>
                )}
                {item!.expiryApplicable && item!.expiryDate && (
                  <div className={`rounded-lg p-3 ${isExpired ? "bg-red-50" : isExpiring ? "bg-amber-50" : "bg-gray-50"}`}>
                    <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" /> Expiry</p>
                    <p className={`font-semibold ${isExpired ? "text-red-700" : isExpiring ? "text-amber-700" : "text-gray-800"}`}>
                      {new Date(item!.expiryDate).toLocaleDateString()}
                      {isExpired && " (Expired)"}
                      {isExpiring && !isExpired && " (Soon)"}
                    </p>
                  </div>
                )}
                {item!.unitPrice && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-400 text-xs mb-0.5">Unit Price</p>
                    <p className="font-semibold text-gray-800">Rs. {item!.unitPrice}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {user && canRecordMovements && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <AnimatePresence mode="wait">
              {!showRestock && !showIssue ? (
                <motion.div key="buttons" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => { resetActionForm(); setShowRestock(true); }}
                    className="h-16 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg text-base"
                    data-testid="button-restock"
                  >
                    <PackagePlus className="w-5 h-5 mr-2" />
                    Restock
                  </Button>
                  <Button
                    onClick={() => { resetActionForm(); setShowIssue(true); }}
                    className="h-16 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg text-base"
                    data-testid="button-issue"
                  >
                    <PackageMinus className="w-5 h-5 mr-2" />
                    Issue
                  </Button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-5">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        {showRestock ? (
                          <><PackagePlus className="w-5 h-5 text-green-600" /> Receive Stock</>
                        ) : (
                          <><PackageMinus className="w-5 h-5 text-blue-600" /> Issue Stock</>
                        )}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm">Quantity ({item!.unit}s) *</Label>
                          <Input
                            type="number"
                            min="1"
                            max={showIssue ? item!.quantity : undefined}
                            value={actionQty}
                            onChange={(e) => setActionQty(e.target.value)}
                            placeholder={showIssue ? `Max: ${item!.quantity}` : "Enter quantity"}
                            className="mt-1 text-lg h-12"
                            autoFocus
                            data-testid="input-action-quantity"
                          />
                          {showIssue && actionQty && parseInt(actionQty) > item!.quantity && (
                            <p className="text-red-500 text-xs mt-1">Cannot issue more than available ({item!.quantity})</p>
                          )}
                          {showRestock && actionQty && (
                            <p className="text-green-600 text-xs mt-1">
                              Stock will be: {item!.quantity} + {actionQty} = {item!.quantity + parseInt(actionQty)} {item!.unit}(s)
                            </p>
                          )}
                          {showIssue && actionQty && parseInt(actionQty) <= item!.quantity && (
                            <p className="text-blue-600 text-xs mt-1">
                              Stock will be: {item!.quantity} - {actionQty} = {item!.quantity - parseInt(actionQty)} {item!.unit}(s)
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">Reference</Label>
                          <Input
                            value={actionRef}
                            onChange={(e) => setActionRef(e.target.value)}
                            placeholder="PO number, requisition, etc."
                            className="mt-1"
                            data-testid="input-action-reference"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Remarks</Label>
                          <Textarea
                            value={actionRemarks}
                            onChange={(e) => setActionRemarks(e.target.value)}
                            placeholder="Optional notes..."
                            className="mt-1"
                            rows={2}
                            data-testid="input-action-remarks"
                          />
                        </div>
                        <div className="flex gap-3 pt-1">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => { setShowRestock(false); setShowIssue(false); resetActionForm(); }}
                            data-testid="button-cancel-action"
                          >
                            Cancel
                          </Button>
                          <Button
                            className={`flex-1 text-white shadow-lg ${
                              showRestock
                                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                            }`}
                            disabled={
                              submitting ||
                              !actionQty ||
                              parseInt(actionQty) <= 0 ||
                              (showIssue && parseInt(actionQty) > item!.quantity)
                            }
                            onClick={() => handleAction(showRestock ? "receipt" : "issue")}
                            data-testid="button-confirm-action"
                          >
                            {submitting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : showRestock ? (
                              "Confirm Restock"
                            ) : (
                              "Confirm Issue"
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {!user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
            <Card className="border-0 shadow-lg border-l-4 border-l-amber-400">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600">Log in to restock or issue this item</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => window.location.href = "/"}
                  data-testid="button-login-prompt"
                >
                  Go to Login
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {data.recentMovements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
              Recent Activity
            </h3>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0 divide-y divide-gray-100">
                {data.recentMovements.map((m) => {
                  const Icon = MOVEMENT_ICONS[m.movementType] || Package;
                  const color = MOVEMENT_COLORS[m.movementType] || "text-gray-600";
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3" data-testid={`movement-${m.id}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 capitalize">
                          {m.movementType} — {m.quantity} {item!.unit}(s)
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(m.timestamp).toLocaleDateString()} by {m.performedBy}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-400">
                        {m.previousQuantity} → {m.newQuantity}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {item!.notes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Card className="border-0 shadow-lg bg-blue-50/50">
              <CardContent className="p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-gray-700">{item!.notes}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
