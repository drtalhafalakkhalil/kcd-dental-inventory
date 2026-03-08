import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Settings as SettingsIcon,
  Info,
  Tags,
  Plus,
  Package,
  Layers,
  Clock,
  User,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Category } from "@shared/schema";

interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  expiringSoon: number;
  totalCategories: number;
  categoryBreakdown: Array<{ name: string; count: number }>;
}

const addCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z.string().min(1, "Category code is required").max(20, "Code must be 20 characters or less"),
  description: z.string().optional(),
});

type AddCategoryForm = z.infer<typeof addCategorySchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [showAddCategory, setShowAddCategory] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: allCategories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const form = useForm<AddCategoryForm>({
    resolver: zodResolver(addCategorySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (data: AddCategoryForm) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Category added", description: "New category has been created successfully." });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      form.reset();
      setShowAddCategory(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmitCategory(data: AddCategoryForm) {
    addCategoryMutation.mutate(data);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-7 h-7 text-cyan-600" />
          <div>
            <h1 data-testid="text-settings-title" className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">System information, categories, and about</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Info className="w-5 h-5 text-cyan-600" />
            <div>
              <CardTitle>System Information</CardTitle>
              <CardDescription>Overview of the current system state</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div data-testid="stat-total-items" className="flex items-center gap-3 p-4 rounded-lg bg-cyan-50 border border-cyan-100">
                  <Package className="w-8 h-8 text-cyan-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalItems ?? 0}</p>
                    <p className="text-xs text-gray-500">Total Items</p>
                  </div>
                </div>
                <div data-testid="stat-total-categories" className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-100">
                  <Layers className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.totalCategories ?? 0}</p>
                    <p className="text-xs text-gray-500">Categories</p>
                  </div>
                </div>
                <div data-testid="stat-low-stock" className="flex items-center gap-3 p-4 rounded-lg bg-orange-50 border border-orange-100">
                  <AlertTriangle className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.lowStockItems ?? 0}</p>
                    <p className="text-xs text-gray-500">Low Stock</p>
                  </div>
                </div>
                <div data-testid="stat-expiring" className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 border border-purple-100">
                  <Calendar className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.expiringSoon ?? 0}</p>
                    <p className="text-xs text-gray-500">Expiring Soon</p>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span data-testid="text-last-updated">Last checked: {new Date().toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-cyan-600" />
              <div>
                <CardTitle>Category Management</CardTitle>
                <CardDescription>View and add inventory categories</CardDescription>
              </div>
            </div>
            <Button
              data-testid="button-add-category"
              size="sm"
              onClick={() => setShowAddCategory(!showAddCategory)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Category
            </Button>
          </CardHeader>
          <CardContent>
            {showAddCategory && (
              <div className="mb-6 p-4 rounded-lg border border-cyan-100 bg-cyan-50/50">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitCategory)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input data-testid="input-category-name" placeholder="e.g. Endodontics" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Code</FormLabel>
                            <FormControl>
                              <Input data-testid="input-category-code" placeholder="e.g. ENDO" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (optional)</FormLabel>
                          <FormControl>
                            <Input data-testid="input-category-description" placeholder="Brief description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button data-testid="button-submit-category" type="submit" disabled={addCategoryMutation.isPending}>
                        {addCategoryMutation.isPending ? "Adding..." : "Add Category"}
                      </Button>
                      <Button
                        data-testid="button-cancel-category"
                        type="button"
                        variant="outline"
                        onClick={() => { setShowAddCategory(false); form.reset(); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {categoriesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : allCategories && allCategories.length > 0 ? (
              <div className="space-y-2">
                {allCategories.map((cat) => (
                  <div
                    key={cat.id}
                    data-testid={`category-row-${cat.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{cat.code}</Badge>
                      <div>
                        <p data-testid={`text-category-name-${cat.id}`} className="text-sm font-medium text-gray-900">{cat.name}</p>
                        {cat.description && (
                          <p className="text-xs text-gray-500">{cat.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" data-testid={`text-category-count-${cat.id}`}>
                      {cat.itemCount} items
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">No categories found. Add one to get started.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="w-5 h-5 text-cyan-600" />
            <div>
              <CardTitle>About</CardTitle>
              <CardDescription>Credits and system details</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 data-testid="text-about-system" className="text-sm font-semibold text-gray-900">KCD Dental Inventory System</h3>
                <p className="text-sm text-gray-600 mt-1">
                  A modern inventory management system for the Dental Materials Department, Khyber College of Dentistry. 
                  Built to track dental materials, manage stock levels, monitor expiry dates, and generate reports.
                </p>
              </div>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Credits</h3>
                <p data-testid="text-credits" className="text-sm text-gray-600 mt-1">
                  Developed for Dr. Talha Falak Khalil, Lecturer at Dental Materials Department, Khyber College of Dentistry.
                </p>
              </div>
              <Separator />
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>Version 1.0.0</span>
                <span>·</span>
                <span>© {new Date().getFullYear()} All rights reserved</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
