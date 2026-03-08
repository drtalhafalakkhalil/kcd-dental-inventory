import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  RotateCcw,
  Plus,
  Search,
  ArrowRightLeft,
  Package,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface InventoryItemData {
  item: {
    id: string;
    itemCode: string;
    folioNumber: string;
    itemName: string;
    quantity: number;
    unit: string;
    minStockLevel: number | null;
  };
  categoryName: string;
  categoryCode: string;
}

interface MovementData {
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


const movementTypeConfig: Record<string, { label: string; icon: typeof ArrowDownCircle; color: string; badgeClass: string }> = {
  issue: {
    label: "Issue",
    icon: ArrowUpCircle,
    color: "text-red-600",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
  receipt: {
    label: "Receipt",
    icon: ArrowDownCircle,
    color: "text-green-600",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  adjustment: {
    label: "Adjustment",
    icon: RefreshCw,
    color: "text-blue-600",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  return: {
    label: "Return",
    icon: RotateCcw,
    color: "text-purple-600",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

export default function StockMovements() {
  const { user: authUser, canRecordMovements } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [movementType, setMovementType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [performedBy, setPerformedBy] = useState("");

  const { toast } = useToast();

  const { data: movements = [], isLoading: movementsLoading } = useQuery<MovementData[]>({
    queryKey: ["/api/movements"],
  });

  const { data: inventoryItems = [] } = useQuery<InventoryItemData[]>({
    queryKey: ["/api/inventory"],
  });

  const selectedItem = inventoryItems.find((i) => i.item.id === selectedItemId);

  const createMovement = useMutation({
    mutationFn: async (data: {
      itemId: string;
      movementType: string;
      quantity: number;
      reference: string;
      remarks: string;
      performedBy: string;
    }) => {
      const res = await apiRequest("POST", "/api/movements", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Movement recorded", description: "Stock has been updated successfully." });
      resetForm();
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setSelectedItemId("");
    setItemSearchQuery("");
    setShowItemDropdown(false);
    setMovementType("");
    setQuantity("");
    setReference("");
    setRemarks("");
    setPerformedBy(authUser?.fullName || authUser?.username || "");
  };

  useEffect(() => {
    if (authUser) {
      setPerformedBy(authUser.fullName || authUser.username || "");
    }
  }, [authUser]);

  const filteredInventoryItems = inventoryItems.filter((i) => {
    if (!itemSearchQuery) return true;
    const q = itemSearchQuery.toLowerCase();
    return (
      i.item.itemName.toLowerCase().includes(q) ||
      i.item.itemCode.toLowerCase().includes(q) ||
      i.item.folioNumber.toLowerCase().includes(q) ||
      (i.categoryName && i.categoryName.toLowerCase().includes(q))
    );
  });

  const handleSubmit = () => {
    if (!selectedItemId || !movementType || !quantity || !performedBy) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be a positive number.", variant: "destructive" });
      return;
    }

    createMovement.mutate({
      itemId: selectedItemId,
      movementType,
      quantity: qty,
      reference,
      remarks,
      performedBy: authUser?.id || performedBy,
    });
  };

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      searchTerm === "" ||
      (m.itemName && m.itemName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.itemCode && m.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.movement.reference && m.movement.reference.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === "all" || m.movement.movementType === typeFilter;

    return matchesSearch && matchesType;
  });

  const getQuantityChangeDisplay = (m: MovementData["movement"]) => {
    const diff = m.newQuantity - m.previousQuantity;
    if (diff > 0) return <span className="text-green-600 font-semibold">+{diff}</span>;
    if (diff < 0) return <span className="text-red-600 font-semibold">{diff}</span>;
    return <span className="text-gray-500 font-semibold">0</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3" data-testid="text-page-title">
                <ArrowRightLeft className="w-8 h-8 text-cyan-600" />
                Stock Movements
              </h1>
              <p className="text-gray-600">Record and track all inventory movements</p>
            </div>
            {canRecordMovements && (
              <Button
                data-testid="button-new-movement"
                className="bg-gradient-to-r from-cyan-600 to-blue-600"
                onClick={() => setShowForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Movement
              </Button>
            )}
          </div>
        </motion.div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-cyan-600" />
                Record Stock Movement
              </DialogTitle>
              <DialogDescription>Select an item and record the movement details.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Item *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    data-testid="select-item"
                    placeholder="Search by name, code, or category..."
                    className="pl-9"
                    value={selectedItemId ? (selectedItem?.item.itemName || "") : itemSearchQuery}
                    onChange={(e) => {
                      setItemSearchQuery(e.target.value);
                      setSelectedItemId("");
                      setShowItemDropdown(true);
                    }}
                    onFocus={() => setShowItemDropdown(true)}
                  />
                  {selectedItemId && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      onClick={() => { setSelectedItemId(""); setItemSearchQuery(""); }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {showItemDropdown && !selectedItemId && (
                  <div className="border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                    {filteredInventoryItems.length === 0 ? (
                      <div className="p-3 text-sm text-gray-400 text-center">No items found</div>
                    ) : (
                      filteredInventoryItems.map((i) => (
                        <button
                          key={i.item.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-cyan-50 flex items-center justify-between transition-colors text-sm border-b last:border-0"
                          data-testid={`item-option-${i.item.id}`}
                          onClick={() => {
                            setSelectedItemId(i.item.id);
                            setItemSearchQuery("");
                            setShowItemDropdown(false);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{i.item.itemName}</p>
                            <p className="text-xs text-gray-400">{i.item.itemCode} &middot; {i.categoryName}</p>
                          </div>
                          <span className="text-xs text-gray-500 shrink-0 ml-2">
                            {i.item.quantity} {i.item.unit || "piece"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedItem && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Current stock: <span className="font-semibold text-gray-700">{selectedItem.item.quantity}</span></span>
                    <span className="text-gray-300">|</span>
                    <span>Unit: <span className="font-semibold text-gray-700">{selectedItem.item.unit || "piece"}</span></span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Movement Type *</Label>
                <Select value={movementType} onValueChange={setMovementType}>
                  <SelectTrigger data-testid="select-movement-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (Add Stock)</SelectItem>
                    <SelectItem value="issue">Issue (Remove Stock)</SelectItem>
                    <SelectItem value="return">Return (Add Back)</SelectItem>
                    <SelectItem value="adjustment">Adjustment (Set Quantity)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {movementType === "adjustment" ? "New Quantity *" : "Quantity *"}
                </Label>
                <Input
                  data-testid="input-quantity"
                  type="number"
                  min="1"
                  placeholder={movementType === "adjustment" ? "Enter new stock level" : "Enter quantity"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {selectedItem && movementType && quantity && !isNaN(parseInt(quantity)) && (
                  <p className="text-xs text-gray-500">
                    {movementType === "adjustment"
                      ? `Stock will be set to ${quantity} ${selectedItem.item.unit || "piece"}(s)`
                      : movementType === "issue"
                        ? `Stock: ${selectedItem.item.quantity} → ${selectedItem.item.quantity - parseInt(quantity)} ${selectedItem.item.unit || "piece"}(s)`
                        : `Stock: ${selectedItem.item.quantity} → ${selectedItem.item.quantity + parseInt(quantity)} ${selectedItem.item.unit || "piece"}(s)`}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Performed By *</Label>
                <Input
                  data-testid="input-performed-by"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder="Your name"
                  readOnly
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  data-testid="input-reference"
                  placeholder="PO number, requisition number, etc."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  data-testid="input-remarks"
                  placeholder="Additional notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { resetForm(); setShowForm(false); }} data-testid="button-cancel-movement">
                  Cancel
                </Button>
                <Button
                  data-testid="button-submit-movement"
                  className="bg-gradient-to-r from-cyan-600 to-blue-600"
                  onClick={handleSubmit}
                  disabled={createMovement.isPending}
                >
                  {createMovement.isPending ? "Recording..." : "Record Movement"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              data-testid="input-search-movements"
              placeholder="Search by item name, code, or reference..."
              className="pl-10 shadow-md bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px] shadow-md bg-white" data-testid="select-type-filter">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="receipt">Receipt</SelectItem>
              <SelectItem value="issue">Issue</SelectItem>
              <SelectItem value="return">Return</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="outline" className="px-4 py-2 text-sm">
            {filteredMovements.length} movements
          </Badge>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Movement History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Item</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Qty</TableHead>
                      <TableHead className="font-semibold">Previous</TableHead>
                      <TableHead className="font-semibold">New</TableHead>
                      <TableHead className="font-semibold">Change</TableHead>
                      <TableHead className="font-semibold">Reference</TableHead>
                      <TableHead className="font-semibold">By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {movementsLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="inline-block">
                              <Package className="w-8 h-8 text-cyan-600" />
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ) : filteredMovements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            No movements found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMovements.map((m, index) => {
                          const config = movementTypeConfig[m.movement.movementType];
                          const TypeIcon = config?.icon || ArrowRightLeft;
                          return (
                            <motion.tr
                              key={m.movement.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-gray-50 transition-colors"
                              data-testid={`row-movement-${m.movement.id}`}
                            >
                              <TableCell className="text-sm text-gray-600">
                                {new Date(m.movement.timestamp).toLocaleDateString()}{" "}
                                <span className="text-xs text-gray-400">
                                  {new Date(m.movement.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm" data-testid={`text-item-name-${m.movement.id}`}>{m.itemName || "Unknown"}</p>
                                  <code className="text-xs text-gray-400">{m.itemCode}</code>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={`${config?.badgeClass || ""} text-xs border`} data-testid={`badge-type-${m.movement.id}`}>
                                  <TypeIcon className="w-3 h-3 mr-1" />
                                  {config?.label || m.movement.movementType}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold" data-testid={`text-qty-${m.movement.id}`}>
                                {m.movement.quantity}
                                {(m as any).itemUnit && <span className="text-xs text-gray-400 font-normal ml-1">{(m as any).itemUnit}</span>}
                              </TableCell>
                              <TableCell className="text-gray-500" data-testid={`text-prev-qty-${m.movement.id}`}>
                                {m.movement.previousQuantity}
                              </TableCell>
                              <TableCell className="font-semibold" data-testid={`text-new-qty-${m.movement.id}`}>
                                {m.movement.newQuantity}
                              </TableCell>
                              <TableCell>{getQuantityChangeDisplay(m.movement)}</TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {m.movement.reference || "-"}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {m.userName || "System"}
                              </TableCell>
                            </motion.tr>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
