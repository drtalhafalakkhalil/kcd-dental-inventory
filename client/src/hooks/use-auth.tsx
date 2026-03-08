import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  username: string;
  fullName: string | null;
  email: string | null;
  role: string;
  isProtected: boolean;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  canManageUsers: boolean;
  canEditInventory: boolean;
  canDeleteInventory: boolean;
  canRecordMovements: boolean;
  canImportExcel: boolean;
  canManageCategories: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string, rememberMe?: boolean) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password, rememberMe: rememberMe ?? false });
    const data = await res.json();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const canManageUsers = user ? ["super_admin", "chairman"].includes(user.role) : false;
  const canEditInventory = user ? ["super_admin", "chairman", "faculty", "lab_assistant"].includes(user.role) : false;
  const canDeleteInventory = user ? ["super_admin", "chairman"].includes(user.role) : false;
  const canRecordMovements = user ? ["super_admin", "chairman", "faculty", "clerk", "lab_assistant"].includes(user.role) : false;
  const canImportExcel = user ? ["super_admin", "chairman"].includes(user.role) : false;
  const canManageCategories = user ? ["super_admin", "chairman", "faculty", "lab_assistant"].includes(user.role) : false;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      refreshUser,
      hasRole,
      canManageUsers,
      canEditInventory,
      canDeleteInventory,
      canRecordMovements,
      canImportExcel,
      canManageCategories,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
