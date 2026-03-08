import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Search, QrCode, Edit, Trash2, Calendar, Package, Download, Plus,
} from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface InventoryItemData {
  item: {
    id: string;
    itemCode: string;
    folioNumber: string;
    itemName: string;
    categoryId: string;
    quantity: number;
    minStockLevel: number | null;
    unitPrice: string | null;
    expiryApplicable: boolean;
    expiryDate: string | null;
    batchNumber: string | null;
    supplier: string | null;
    location: string | null;
    notes: string | null;
    qrCode: string;
    createdAt: string;
  };
  categoryName: string;
  categoryCode: string;
}

interface CategoryData {
  id: string;
  name: string;
  code: string;
  itemCount: number;
}

const UNIT_OPTIONS = [
  "piece", "box", "pack", "bottle", "tube", "set",
  "roll", "sheet", "pair", "kit", "tin", "jar",
  "sachet", "cartridge", "syringe", "capsule",
  "bag", "ream", "dozen", "unit",
];

const emptyForm = {
  itemName: "",
  folioNumber: "",
  itemCode: "",
  categoryId: "",
  quantity: 0,
  unit: "piece",
  minStockLevel: 10,
  unitPrice: "",
  expiryApplicable: false,
  expiryDate: "",
  batchNumber: "",
  supplier: "",
  location: "",
  notes: "",
};

export default function InventoryList() {
  const { canEditInventory, canDeleteInventory } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showQR, setShowQR] = useState(false);
  const [selectedQRItem, setSelectedQRItem] = useState<InventoryItemData | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [location] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.includes("action=add")) {
      setShowAddDialog(true);
    }
  }, [location]);

  const { data: items = [], isLoading } = useQuery<InventoryItemData[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ["/api/categories"],
  });

  const addItem = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddDialog(false);
      setFormData({ ...emptyForm });
    },
  });

  const editItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/inventory/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowEditDialog(false);
      setEditingItemId(null);
      setFormData({ ...emptyForm });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
  });

  const getExpiryStatus = (item: InventoryItemData["item"]) => {
    if (!item.expiryApplicable || !item.expiryDate) return null;
    const expiryDate = new Date(item.expiryDate);
    if (isNaN(expiryDate.getTime())) return null;
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry < 0) return { status: "expired", color: "bg-red-100 text-red-800 border-red-200", days: daysUntilExpiry };
    if (daysUntilExpiry <= 30) return { status: "critical", color: "bg-orange-100 text-orange-800 border-orange-200", days: daysUntilExpiry };
    if (daysUntilExpiry <= 60) return { status: "warning", color: "bg-yellow-100 text-yellow-800 border-yellow-200", days: daysUntilExpiry };
    return { status: "good", color: "bg-green-100 text-green-800 border-green-200", days: daysUntilExpiry };
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchTerm === "" ||
      item.item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item.folioNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || item.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const downloadQR = (item: InventoryItemData) => {
    const link = document.createElement("a");
    link.download = `QR_${item.item.itemCode}.png`;
    link.href = item.item.qrCode;
    link.click();
  };

  const openEditDialog = (item: InventoryItemData) => {
    setEditingItemId(item.item.id);
    setFormData({
      itemName: item.item.itemName,
      folioNumber: item.item.folioNumber,
      itemCode: item.item.itemCode,
      categoryId: item.item.categoryId,
      quantity: item.item.quantity,
      unit: (item.item as any).unit || "piece",
      minStockLevel: item.item.minStockLevel ?? 10,
      unitPrice: item.item.unitPrice || "",
      expiryApplicable: item.item.expiryApplicable,
      expiryDate: item.item.expiryDate ? item.item.expiryDate.split("T")[0] : "",
      batchNumber: item.item.batchNumber || "",
      supplier: item.item.supplier || "",
      location: item.item.location || "",
      notes: item.item.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleSubmitAdd = () => {
    const cat = categories.find((c) => c.id === formData.categoryId);
    const catCode = cat?.code || "GEN";
    const autoCode = `KCD-${catCode}-${formData.folioNumber.padStart(3, "0")}`;

    addItem.mutate({
      itemName: formData.itemName,
      folioNumber: formData.folioNumber,
      itemCode: autoCode,
      categoryId: formData.categoryId,
      quantity: Number(formData.quantity),
      minStockLevel: Number(formData.minStockLevel),
      unitPrice: formData.unitPrice || null,
      expiryApplicable: formData.expiryApplicable,
      expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
      batchNumber: formData.batchNumber || null,
      supplier: formData.supplier || null,
      location: formData.location || null,
      notes: formData.notes || null,
    });
  };

  const handleSubmitEdit = () => {
    if (!editingItemId) return;
    editItem.mutate({
      id: editingItemId,
      data: {
        itemName: formData.itemName,
        folioNumber: formData.folioNumber,
        categoryId: formData.categoryId,
        quantity: Number(formData.quantity),
        minStockLevel: Number(formData.minStockLevel),
        unitPrice: formData.unitPrice || null,
        expiryApplicable: formData.expiryApplicable,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : null,
        batchNumber: formData.batchNumber || null,
        supplier: formData.supplier || null,
        location: formData.location || null,
        notes: formData.notes || null,
      },
    });
  };

  const renderItemForm = (mode: "add" | "edit") => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="sm:col-span-2">
        <Label>Item Name *</Label>
        <Input
          value={formData.itemName}
          onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
          placeholder="e.g. Composite Resin A2"
          data-testid="input-item-name"
        />
      </div>
      <div>
        <Label>Folio Number *</Label>
        <Input
          value={formData.folioNumber}
          onChange={(e) => setFormData({ ...formData, folioNumber: e.target.value })}
          placeholder="e.g. 001"
          data-testid="input-folio-number"
        />
      </div>
      <div>
        <Label>Category *</Label>
        <Select
          value={formData.categoryId}
          onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
        >
          <SelectTrigger data-testid="select-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Quantity</Label>
        <Input
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
          data-testid="input-quantity"
        />
      </div>
      <div>
        <Label>Unit</Label>
        <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
          <SelectTrigger data-testid="select-unit">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((u) => (
              <SelectItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Min Stock Level</Label>
        <Input
          type="number"
          value={formData.minStockLevel}
          onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
          data-testid="input-min-stock"
        />
      </div>
      <div>
        <Label>Unit Price (PKR)</Label>
        <Input
          value={formData.unitPrice}
          onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
          placeholder="0.00"
          data-testid="input-unit-price"
        />
      </div>
      <div>
        <Label>Batch Number</Label>
        <Input
          value={formData.batchNumber}
          onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
          data-testid="input-batch-number"
        />
      </div>
      <div>
        <Label>Supplier</Label>
        <Input
          value={formData.supplier}
          onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
          data-testid="input-supplier"
        />
      </div>
      <div>
        <Label>Location</Label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g. Cabinet A, Shelf 2"
          data-testid="input-location"
        />
      </div>
      <div className="flex items-center gap-3 pt-5">
        <Switch
          checked={formData.expiryApplicable}
          onCheckedChange={(val) => setFormData({ ...formData, expiryApplicable: val })}
          data-testid="switch-expiry"
        />
        <Label>Expiry Applicable</Label>
      </div>
      {formData.expiryApplicable && (
        <div>
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={formData.expiryDate}
            onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
            data-testid="input-expiry-date"
          />
        </div>
      )}
      <div className="sm:col-span-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
          data-testid="input-notes"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3" data-testid="text-inventory-title">
              <Package className="w-8 h-8 text-cyan-600" />
              Inventory Management
            </h1>
            <p className="text-gray-600">Manage and track all dental materials</p>
          </div>
          {canEditInventory && (
            <Button
              onClick={() => {
                setFormData({ ...emptyForm });
                setShowAddDialog(true);
              }}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg"
              data-testid="button-add-new-item"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap gap-4"
        >
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, code, or folio number..."
              className="pl-10 shadow-md bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-inventory"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[250px] shadow-md bg-white" data-testid="select-filter-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.name}>
                  {cat.name} ({cat.itemCount || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="px-4 py-2 text-sm" data-testid="text-item-count">
            {filteredItems.length} items found
          </Badge>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-5 h-5" />
                Inventory Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Folio No.</TableHead>
                      <TableHead className="font-semibold">Item Code</TableHead>
                      <TableHead className="font-semibold">Item Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Quantity</TableHead>
                      <TableHead className="font-semibold">Expiry Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="inline-block"
                            >
                              <Package className="w-8 h-8 text-cyan-600" />
                            </motion.div>
                          </TableCell>
                        </TableRow>
                      ) : filteredItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No items found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredItems.map((item, index) => {
                          const expiryStatus = getExpiryStatus(item.item);
                          return (
                            <motion.tr
                              key={item.item.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.02 }}
                              className="hover:bg-gray-50 transition-colors"
                              data-testid={`row-item-${item.item.id}`}
                            >
                              <TableCell className="font-medium">{item.item.folioNumber}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {item.item.itemCode}
                                </code>
                              </TableCell>
                              <TableCell className="font-medium">{item.item.itemName}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {item.categoryName}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    item.item.quantity <= (item.item.minStockLevel || 10)
                                      ? "text-red-600 font-semibold"
                                      : ""
                                  }
                                >
                                  {item.item.quantity}
                                </span>
                                <span className="text-xs text-gray-400 ml-1">
                                  {(item.item as any).unit || "piece"}
                                </span>
                              </TableCell>
                              <TableCell>
                                {expiryStatus ? (
                                  <Badge className={`${expiryStatus.color} text-xs border`}>
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {expiryStatus.status === "expired"
                                      ? "Expired"
                                      : `${expiryStatus.days}d`}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-xs">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQRItem(item);
                                      setShowQR(true);
                                    }}
                                    data-testid={`button-qr-${item.item.id}`}
                                  >
                                    <QrCode className="w-4 h-4" />
                                  </Button>
                                  {canEditInventory && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditDialog(item)}
                                      data-testid={`button-edit-${item.item.id}`}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {canDeleteInventory && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this item?")) {
                                          deleteItem.mutate(item.item.id);
                                        }
                                      }}
                                      data-testid={`button-delete-${item.item.id}`}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
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

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
            <DialogDescription>
              {selectedQRItem?.item.itemName} ({selectedQRItem?.item.itemCode})
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {selectedQRItem?.item.qrCode && (
              <img
                src={selectedQRItem.item.qrCode}
                alt="QR Code"
                className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                data-testid="img-qr-code"
              />
            )}
            <Button onClick={() => selectedQRItem && downloadQR(selectedQRItem)} data-testid="button-download-qr">
              <Download className="w-4 h-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddDialog}
        onOpenChange={(val) => {
          setShowAddDialog(val);
          if (!val) setFormData({ ...emptyForm });
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-600" />
              Add New Item
            </DialogTitle>
            <DialogDescription>Add a new material to the inventory</DialogDescription>
          </DialogHeader>
          {renderItemForm("add")}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAdd}
              disabled={!formData.itemName || !formData.folioNumber || !formData.categoryId || addItem.isPending}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
              data-testid="button-submit-add"
            >
              {addItem.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditDialog}
        onOpenChange={(val) => {
          setShowEditDialog(val);
          if (!val) {
            setEditingItemId(null);
            setFormData({ ...emptyForm });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-cyan-600" />
              Edit Item
            </DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          {renderItemForm("edit")}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEdit}
              disabled={!formData.itemName || !formData.categoryId || editItem.isPending}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
              data-testid="button-submit-edit"
            >
              {editItem.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
