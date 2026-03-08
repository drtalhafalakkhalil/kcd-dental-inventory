import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  UserCog,
  Crown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  role: string;
  isProtected: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  super_admin: { label: "Super Admin", color: "bg-red-100 text-red-800 border-red-200", icon: ShieldCheck },
  chairman: { label: "Chairman", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Crown },
  faculty: { label: "Faculty", color: "bg-blue-100 text-blue-800 border-blue-200", icon: UserCog },
  clerk: { label: "Clerk", color: "bg-green-100 text-green-800 border-green-200", icon: Users },
  lab_assistant: { label: "Lab Assistant", color: "bg-orange-100 text-orange-800 border-orange-200", icon: Users },
  student: { label: "Student", color: "bg-gray-100 text-gray-800 border-gray-200", icon: Users },
};

const ASSIGNABLE_ROLES = [
  { value: "chairman", label: "Chairman" },
  { value: "faculty", label: "Faculty" },
  { value: "clerk", label: "Clerk" },
  { value: "lab_assistant", label: "Lab Assistant" },
  { value: "student", label: "Student" },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserData | null>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "student",
  });

  const { data: allUsers = [], isLoading } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
  });

  const resetForm = () => {
    setFormData({ username: "", password: "", fullName: "", email: "", role: "student" });
  };

  const getAvailableRoles = () => {
    if (!currentUser) return [];
    if (currentUser.role === "super_admin") return ASSIGNABLE_ROLES;
    if (currentUser.role === "chairman") {
      return ASSIGNABLE_ROLES.filter(r => r.value !== "chairman");
    }
    return [];
  };

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 6) return "Password must be at least 6 characters";
    if (!/[a-zA-Z]/.test(pw)) return "Password must contain at least one letter";
    if (!/[0-9]/.test(pw)) return "Password must contain at least one number";
    return null;
  };

  const handleCreate = async () => {
    const pwError = validatePassword(formData.password);
    if (pwError) {
      toast({ title: "Weak Password", description: pwError, variant: "destructive" });
      return;
    }
    try {
      await apiRequest("POST", "/api/users", formData);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "User created successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    try {
      const updates: any = {};
      if (formData.fullName) updates.fullName = formData.fullName;
      if (formData.email) updates.email = formData.email;
      if (formData.role && formData.role !== editUser.role) updates.role = formData.role;
      if (formData.password) {
        const pwError = validatePassword(formData.password);
        if (pwError) {
          toast({ title: "Weak Password", description: pwError, variant: "destructive" });
          return;
        }
        updates.password = formData.password;
      }

      await apiRequest("PUT", `/api/users/${editUser.id}`, updates);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
      resetForm();
      toast({ title: "User updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      await apiRequest("DELETE", `/api/users/${deleteUser.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteUser(null);
      toast({ title: "User deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (u: UserData) => {
    setFormData({
      username: u.username,
      password: "",
      fullName: u.fullName || "",
      email: u.email || "",
      role: u.role,
    });
    setEditUser(u);
  };

  const canModifyUser = (targetUser: UserData) => {
    if (!currentUser) return false;
    if (targetUser.isProtected && currentUser.id !== targetUser.id) return false;
    if (targetUser.id === currentUser.id) return false;
    const hierarchy: Record<string, number> = {
      super_admin: 6, chairman: 5, faculty: 4, clerk: 3, lab_assistant: 2, student: 1,
    };
    return (hierarchy[currentUser.role] || 0) > (hierarchy[targetUser.role] || 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-8 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3" data-testid="text-users-title">
            <Users className="w-8 h-8" />
            User Management
          </h1>
          <p className="text-cyan-100 mt-1">Manage system users and their access levels</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Users</CardTitle>
                <CardDescription>{allUsers.length} registered users</CardDescription>
              </div>
              <Button
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                className="bg-cyan-600 hover:bg-cyan-700"
                data-testid="button-create-user"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-400">Loading...</TableCell>
                    </TableRow>
                  ) : allUsers.map((u) => {
                    const roleConfig = ROLE_LABELS[u.role] || ROLE_LABELS.student;
                    const RoleIcon = roleConfig.icon;
                    return (
                      <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                              u.isProtected
                                ? "bg-gradient-to-br from-red-500 to-orange-500 text-white"
                                : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                            }`}>
                              {(u.fullName || u.username).substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{u.fullName || u.username}</p>
                              {u.isProtected && (
                                <span className="text-xs text-red-500 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Protected
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{u.username}</TableCell>
                        <TableCell className="text-sm text-gray-500">{u.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${roleConfig.color} flex items-center gap-1 w-fit`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.id === currentUser?.id ? (
                            <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200">You</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canModifyUser(u) ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(u)}
                                data-testid={`button-edit-user-${u.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => setDeleteUser(u)}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new user to the system with a specific role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Dr. John Doe"
                  data-testid="input-user-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@kcd.edu.pk"
                  data-testid="input-user-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                  required
                  data-testid="input-user-username"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  data-testid="input-user-password"
                />
                <p className="text-xs text-muted-foreground">Min 6 characters, must include a letter and a number</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button
                onClick={handleCreate}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={!formData.username || !formData.password || !formData.role}
                data-testid="button-submit-create-user"
              >
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  data-testid="input-edit-fullname"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Password (leave empty to keep current)</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                data-testid="input-edit-password"
              />
              <p className="text-xs text-muted-foreground">Min 6 characters, must include a letter and a number</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={handleUpdate} className="bg-cyan-600 hover:bg-cyan-700" data-testid="button-submit-edit-user">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.fullName || deleteUser?.username}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete-user">
              Delete User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
