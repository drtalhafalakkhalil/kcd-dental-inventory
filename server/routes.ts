import type { Express, Request, Response, NextFunction } from "express";
  import type { Server } from "http";
  import { db } from "./db";
  import { categories, inventoryItems, inventoryMovements, users, auditLogs, type UserRole, USER_ROLES } from "../shared/schema";
  import { eq, desc, and, or, sql, like, lt, gte } from "drizzle-orm";
  import QRCode from "qrcode";
  import multer from "multer";
  import ExcelJS from "exceljs";
  import { hashPassword, comparePasswords } from "./auth";

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
  });

  function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    next();
  }

  function requireSetupComplete(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    db.select().from(users).where(eq(users.id, req.session.userId)).then(([user]) => {
      if (user?.mustChangePassword) {
        return res.status(403).json({ error: "Please complete account setup first" });
      }
      next();
    }).catch(() => next());
  }

  function requireRole(...roles: UserRole[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      try {
        const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
        if (!user || !roles.includes(user.role as UserRole)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (user.mustChangePassword) {
          return res.status(403).json({ error: "Please complete account setup first" });
        }
        next();
      } catch {
        return res.status(500).json({ error: "Authorization check failed" });
      }
    };
  }

  const ROLE_HIERARCHY: Record<UserRole, number> = {
    super_admin: 6,
    chairman: 5,
    faculty: 4,
    clerk: 3,
    lab_assistant: 2,
    student: 1,
  };

  async function logAudit(tableName: string, recordId: string, action: string, previousData: any, newData: any, userId: string | null, userDisplayName: string | null) {
    try {
      await db.insert(auditLogs).values({
        tableName,
        recordId,
        action,
        previousData,
        newData,
        userId,
        userDisplayName,
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  }

  function validatePassword(pw: string): string | null {
    if (pw.length < 6) return "Password must be at least 6 characters long";
    if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must contain at least one letter and one number";
    return null;
  }

  export async function registerRoutes(server: Server, app: Express) {

    // ==================== AUTHENTICATION ====================

    app.post("/api/auth/login", async (req, res) => {
      try {
        const { username, password, rememberMe } = req.body;
        if (!username || !password) {
          return res.status(400).json({ error: "Username and password required" });
        }
        const [user] = await db.select().from(users).where(eq(users.username, username));
        if (!user) {
          return res.status(401).json({ error: "Invalid username or password" });
        }
        const valid = await comparePasswords(password, user.password);
        if (!valid) {
          return res.status(401).json({ error: "Invalid username or password" });
        }
        req.session.userId = user.id;
        if (rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
          req.session.cookie.maxAge = 24 * 60 * 60 * 1000;
        }
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isProtected: user.isProtected,
          mustChangePassword: user.mustChangePassword,
        });
      } catch (error: any) {
        console.error("Login error:", error.message, error.stack?.split('\n')[1]);
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/auth/me", async (req, res) => {
      if (!req.session?.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      try {
        const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
        if (!user) {
          req.session.destroy(() => {});
          return res.status(401).json({ error: "User not found" });
        }
        res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isProtected: user.isProtected,
          mustChangePassword: user.mustChangePassword,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/auth/setup-account", requireAuth, async (req, res) => {
      try {
        const { password, email, fullName } = req.body;
        if (!password) {
          return res.status(400).json({ error: "Password is required" });
        }
        const pwError = validatePassword(password);
        if (pwError) {
          return res.status(400).json({ error: pwError });
        }
        const [user] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        if (!user || !user.mustChangePassword) {
          return res.status(400).json({ error: "Account setup not required" });
        }
        const hashed = await hashPassword(password);
        const updates: any = { password: hashed, mustChangePassword: false };
        if (email) updates.email = email;
        if (fullName) updates.fullName = fullName;
        const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
        res.json({
          id: updated.id,
          username: updated.username,
          fullName: updated.fullName,
          email: updated.email,
          role: updated.role,
          isProtected: updated.isProtected,
          mustChangePassword: updated.mustChangePassword,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/auth/register-student", async (req, res) => {
      try {
        const { username, password, fullName, email } = req.body;
        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required" });
        }
        if (username.length < 3) {
          return res.status(400).json({ error: "Username must be at least 3 characters" });
        }
        const pwError = validatePassword(password);
        if (pwError) {
          return res.status(400).json({ error: pwError });
        }
        const hashed = await hashPassword(password);
        const [newUser] = await db.insert(users).values({
          username,
          password: hashed,
          fullName: fullName || null,
          email: email || null,
          role: "student",
          isProtected: false,
          mustChangePassword: false,
        }).returning();
        res.json({
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          role: newUser.role,
        });
      } catch (error: any) {
        if (error.message?.includes("unique")) {
          return res.status(400).json({ error: "Username already taken. Please choose another." });
        }
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/auth/logout", (req, res) => {
      req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: "Logout failed" });
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });

    // ==================== USERS ====================

    app.get("/api/users", requireAuth, async (req, res) => {
      try {
        const allUsers = await db
          .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            email: users.email,
            role: users.role,
            isProtected: users.isProtected,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(users.createdAt);
        res.json(allUsers);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/users", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const { username, password, fullName, email, role } = req.body;
        if (!username || !password || !role) {
          return res.status(400).json({ error: "Username, password, and role are required" });
        }
        const pwErr = validatePassword(password);
        if (pwErr) return res.status(400).json({ error: pwErr });
        if (!USER_ROLES.includes(role)) {
          return res.status(400).json({ error: "Invalid role" });
        }

        const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        const currentLevel = ROLE_HIERARCHY[currentUser.role as UserRole] || 0;
        const targetLevel = ROLE_HIERARCHY[role as UserRole] || 0;
        if (targetLevel >= currentLevel) {
          return res.status(403).json({ error: "Cannot create a user with equal or higher role than your own" });
        }

        const hashed = await hashPassword(password);
        const [newUser] = await db.insert(users).values({
          username,
          password: hashed,
          fullName: fullName || null,
          email: email || null,
          role,
          isProtected: false,
          mustChangePassword: true,
        }).returning();

        res.json({
          id: newUser.id,
          username: newUser.username,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          isProtected: newUser.isProtected,
          mustChangePassword: newUser.mustChangePassword,
        });
      } catch (error: any) {
        if (error.message?.includes("unique")) {
          return res.status(400).json({ error: "Username already exists" });
        }
        res.status(500).json({ error: error.message });
      }
    });

    app.put("/api/users/:id", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const { id } = req.params;
        const { fullName, email, role, password } = req.body;

        const [targetUser] = await db.select().from(users).where(eq(users.id, id));
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        if (targetUser.isProtected) {
          if (req.session.userId === targetUser.id && password) {
            const pwErr2 = validatePassword(password);
            if (pwErr2) return res.status(400).json({ error: pwErr2 });
            const hashed = await hashPassword(password);
            const [updated] = await db.update(users).set({ password: hashed }).where(eq(users.id, id)).returning();
            return res.json({
              id: updated.id,
              username: updated.username,
              fullName: updated.fullName,
              email: updated.email,
              role: updated.role,
              isProtected: updated.isProtected,
            });
          }
          return res.status(403).json({ error: "This account is protected and cannot be modified" });
        }

        const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        const currentLevel = ROLE_HIERARCHY[currentUser.role as UserRole] || 0;
        const targetLevel = ROLE_HIERARCHY[targetUser.role as UserRole] || 0;

        if (targetLevel >= currentLevel && currentUser.id !== targetUser.id) {
          return res.status(403).json({ error: "Cannot modify a user with equal or higher role" });
        }

        const updates: any = {};
        if (fullName !== undefined) updates.fullName = fullName;
        if (email !== undefined) updates.email = email;
        if (role) {
          const newLevel = ROLE_HIERARCHY[role as UserRole] || 0;
          if (newLevel >= currentLevel) {
            return res.status(403).json({ error: "Cannot assign a role equal to or higher than your own" });
          }
          updates.role = role;
        }
        if (password) {
          const pwErr3 = validatePassword(password);
          if (pwErr3) return res.status(400).json({ error: pwErr3 });
          updates.password = await hashPassword(password);
        }

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ error: "No updates provided" });
        }

        const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
        res.json({
          id: updated.id,
          username: updated.username,
          fullName: updated.fullName,
          email: updated.email,
          role: updated.role,
          isProtected: updated.isProtected,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.delete("/api/users/:id", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const { id } = req.params;
        const [targetUser] = await db.select().from(users).where(eq(users.id, id));
        if (!targetUser) return res.status(404).json({ error: "User not found" });

        if (targetUser.isProtected) {
          return res.status(403).json({ error: "This account is protected and cannot be deleted" });
        }

        if (id === req.session.userId) {
          return res.status(403).json({ error: "Cannot delete your own account" });
        }

        const [currentUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        const currentLevel = ROLE_HIERARCHY[currentUser.role as UserRole] || 0;
        const targetLevel = ROLE_HIERARCHY[targetUser.role as UserRole] || 0;

        if (targetLevel >= currentLevel) {
          return res.status(403).json({ error: "Cannot delete a user with equal or higher role" });
        }

        await db.delete(users).where(eq(users.id, id));
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== CATEGORIES ====================
    
    // Get all categories with item counts
    app.get("/api/categories", requireAuth, async (req, res) => {
      try {
        const allCategories = await db
          .select({
            id: categories.id,
            name: categories.name,
            code: categories.code,
            description: categories.description,
            itemCount: sql<number>`(SELECT COUNT(*)::int FROM ${inventoryItems} WHERE ${inventoryItems.categoryId} = ${categories.id})`,
            createdAt: categories.createdAt,
          })
          .from(categories)
          .orderBy(categories.name);
        
        res.json(allCategories);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create new category
    app.post("/api/categories", requireRole("super_admin", "chairman", "faculty", "lab_assistant"), async (req, res) => {
      try {
        const [category] = await db.insert(categories).values(req.body).returning();
        res.json(category);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== INVENTORY ITEMS ====================
    
    // Get all inventory items with category info
    app.get("/api/inventory", requireAuth, async (req, res) => {
      try {
        const { search, category, expiryStatus } = req.query;
        
        const items = await db
          .select({
            item: inventoryItems,
            categoryName: categories.name,
            categoryCode: categories.code,
          })
          .from(inventoryItems)
          .leftJoin(categories, eq(inventoryItems.categoryId, categories.id));
        
        res.json(items);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Low stock items
    app.get("/api/inventory/low-stock", requireAuth, async (req, res) => {
      try {
        const items = await db
          .select({
            item: inventoryItems,
            categoryName: categories.name,
          })
          .from(inventoryItems)
          .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
          .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`)
          .orderBy(inventoryItems.quantity);

        res.json(items);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Expiring items
    app.get("/api/inventory/expiring", requireAuth, async (req, res) => {
      try {
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

        const items = await db
          .select({
            item: inventoryItems,
            categoryName: categories.name,
          })
          .from(inventoryItems)
          .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
          .where(
            and(
              eq(inventoryItems.expiryApplicable, true),
              lt(inventoryItems.expiryDate, ninetyDaysFromNow)
            )
          )
          .orderBy(inventoryItems.expiryDate);

        res.json(items);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/inventory/lookup", async (req, res) => {
      try {
        const { code, folio } = req.query;
        if (!code && !folio) {
          return res.status(400).json({ error: "Provide 'code' or 'folio' query parameter" });
        }

        const conditions = [];
        if (code) conditions.push(eq(inventoryItems.itemCode, String(code)));
        if (folio) conditions.push(eq(inventoryItems.folioNumber, String(folio)));

        const [result] = await db
          .select({
            item: inventoryItems,
            categoryName: categories.name,
            categoryCode: categories.code,
          })
          .from(inventoryItems)
          .leftJoin(categories, eq(inventoryItems.categoryId, categories.id))
          .where(or(...conditions));

        if (!result) {
          return res.status(404).json({ error: "Item not found" });
        }

        const recentMovements = await db
          .select()
          .from(inventoryMovements)
          .where(eq(inventoryMovements.itemId, result.item.id))
          .orderBy(desc(inventoryMovements.timestamp))
          .limit(5);

        res.json({ ...result, recentMovements });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get single inventory item
    app.get("/api/inventory/:id", requireAuth, async (req, res) => {
      try {
        const [item] = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, req.params.id));
        
        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }
        
        res.json(item);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create new inventory item with QR code
    app.post("/api/inventory", requireRole("super_admin", "chairman", "faculty", "lab_assistant"), async (req, res) => {
      try {
        const itemData = req.body;
        
        const host = `${req.protocol}://${req.get('host')}`;
        const qrData = `${host}/scan?code=${encodeURIComponent(itemData.itemCode)}`;
        
        const qrCodeDataURL = await QRCode.toDataURL(qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#0891B2',
            light: '#FFFFFF'
          }
        });
        
        itemData.qrCode = qrCodeDataURL;
        
        const [item] = await db.insert(inventoryItems).values(itemData).returning();
        const [auditUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        const { qrCode: _qr, ...itemForLog } = item;
        await logAudit("inventory_items", item.id, "create", null, itemForLog, req.session.userId!, auditUser?.fullName || auditUser?.username || "Unknown");
        res.json(item);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update inventory item
    app.put("/api/inventory/:id", requireRole("super_admin", "chairman", "faculty", "lab_assistant"), async (req, res) => {
      try {
        const [oldItem] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, req.params.id));
        const [item] = await db
          .update(inventoryItems)
          .set({ ...req.body, updatedAt: new Date() })
          .where(eq(inventoryItems.id, req.params.id))
          .returning();
        const [auditUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        const changes: any = {};
        const oldValues: any = {};
        if (oldItem) {
          for (const key of Object.keys(req.body)) {
            if (key !== "updatedAt" && key !== "qrCode" && (oldItem as any)[key] !== req.body[key]) {
              oldValues[key] = (oldItem as any)[key];
              changes[key] = req.body[key];
            }
          }
        }
        await logAudit("inventory_items", item.id, "update", { ...oldValues, itemName: oldItem?.itemName, itemCode: oldItem?.itemCode }, { ...changes, itemName: item.itemName, itemCode: item.itemCode }, req.session.userId!, auditUser?.fullName || auditUser?.username || "Unknown");
        res.json(item);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Delete inventory item
    app.delete("/api/inventory/:id", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const [oldItem] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, req.params.id));
        await db.delete(inventoryMovements).where(eq(inventoryMovements.itemId, req.params.id));
        await db.delete(inventoryItems).where(eq(inventoryItems.id, req.params.id));
        const [auditUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
        if (oldItem) {
          const { qrCode, ...itemWithoutQR } = oldItem;
          await logAudit("inventory_items", req.params.id, "delete", itemWithoutQR, null, req.session.userId!, auditUser?.fullName || auditUser?.username || "Unknown");
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== EXCEL IMPORT ====================
    
    app.post("/api/inventory/import/excel", requireRole("super_admin", "chairman"), upload.single('file'), async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        const data: any[] = [];
        const headers: string[] = [];
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) {
            (row.values as any[]).forEach((val, idx) => { headers[idx] = String(val ?? ''); });
          } else {
            const obj: any = {};
            (row.values as any[]).forEach((val, idx) => {
              if (headers[idx]) obj[headers[idx]] = val;
            });
            data.push(obj);
          }
        });
        
        const imported = [];
        const errors = [];
        
        for (const row of data as any[]) {
          try {
            // Find or create category
            let categoryId: string;
            const categoryName = row.Category || 'Uncategorized';
            
            const [existingCategory] = await db
              .select()
              .from(categories)
              .where(eq(categories.name, categoryName));
            
            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              const categoryCode = categoryName
                .toUpperCase()
                .replace(/[^A-Z]/g, '')
                .substring(0, 6);
              
              const [newCategory] = await db
                .insert(categories)
                .values({
                  name: categoryName,
                  code: categoryCode || 'GEN',
                  description: `Auto-created from import`
                })
                .returning();
              
              categoryId = newCategory.id;
            }
            
            // Generate item code
            const categoryCodePrefix = categoryName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'GEN';
            const itemCode = `KCD-${categoryCodePrefix}-${String(row['Code No.'] || row['Folio No.']).padStart(3, '0')}`;
            
            // Check if item already exists
            const [existing] = await db
              .select()
              .from(inventoryItems)
              .where(eq(inventoryItems.folioNumber, String(row['Folio No.'])));
            
            if (existing) {
              errors.push({ row, reason: `Folio ${row['Folio No.']} already exists` });
              continue;
            }
            
            const host = `${req.protocol}://${req.get('host')}`;
            const qrData = `${host}/scan?code=${encodeURIComponent(itemCode)}`;
            
            const qrCodeDataURL = await QRCode.toDataURL(qrData, {
              width: 300,
              margin: 2,
              color: {
                dark: '#0891B2',
                light: '#FFFFFF'
              }
            });
            
            const [item] = await db.insert(inventoryItems).values({
              itemCode,
              folioNumber: String(row['Folio No.']),
              itemName: row['Item Name'],
              categoryId,
              expiryApplicable: row['Expiry Applicable'] === 'Yes',
              quantity: row.Quantity || 0,
              qrCode: qrCodeDataURL,
            }).returning();
            
            imported.push(item);
          } catch (error: any) {
            errors.push({ row, reason: error.message });
          }
        }
        
        res.json({ 
          success: true, 
          imported: imported.length,
          errors: errors.length,
          items: imported,
          errorDetails: errors
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== DASHBOARD STATS ====================
    
    app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
      try {
        // Total items
        const [totalResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems);
        
        // Low stock items
        const [lowStockResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems)
          .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`);
        
        // Expiring soon (60 days)
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);
        
        const [expiringSoonResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.expiryApplicable, true),
              lt(inventoryItems.expiryDate, sixtyDaysFromNow)
            )
          );
        
        // Total categories
        const [categoriesResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(categories);
        
        // Category breakdown
        const categoryBreakdown = await db
          .select({
            name: categories.name,
            count: sql<number>`COUNT(${inventoryItems.id})::int`,
          })
          .from(categories)
          .leftJoin(inventoryItems, eq(categories.id, inventoryItems.categoryId))
          .groupBy(categories.id, categories.name)
          .orderBy(desc(sql`COUNT(${inventoryItems.id})`));
        
        const [totalValue] = await db
          .select({ total: sql<string>`COALESCE(SUM(CAST(${inventoryItems.unitPrice} AS numeric) * ${inventoryItems.quantity}), 0)` })
          .from(inventoryItems);

        const recentMovements = await db
          .select({
            movement: inventoryMovements,
            itemName: inventoryItems.itemName,
            itemCode: inventoryItems.itemCode,
            userName: users.username,
          })
          .from(inventoryMovements)
          .leftJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
          .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
          .orderBy(desc(inventoryMovements.timestamp))
          .limit(10);

        const movementStats = await db
          .select({
            type: inventoryMovements.movementType,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(inventoryMovements)
          .groupBy(inventoryMovements.movementType);

        res.json({
          totalItems: totalResult.count,
          totalValue: totalValue.total,
          lowStockItems: lowStockResult.count,
          expiringSoon: expiringSoonResult.count,
          totalCategories: categoriesResult.count,
          categoryBreakdown,
          recentMovements,
          movementStats,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== INVENTORY MOVEMENTS ====================
    
    app.get("/api/movements", requireAuth, async (req, res) => {
      try {
        const movements = await db
          .select({
            movement: inventoryMovements,
            itemName: inventoryItems.itemName,
            itemCode: inventoryItems.itemCode,
            itemUnit: inventoryItems.unit,
            userName: users.username,
          })
          .from(inventoryMovements)
          .leftJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
          .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
          .orderBy(desc(inventoryMovements.timestamp));
        
        res.json(movements);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/movements", requireRole("super_admin", "chairman", "faculty", "clerk", "lab_assistant"), async (req, res) => {
      try {
        const { itemId, movementType, quantity, reference, remarks, performedBy } = req.body;

        const [item] = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.id, itemId));

        if (!item) {
          return res.status(404).json({ error: "Item not found" });
        }

        const previousQuantity = item.quantity;
        let newQuantity = previousQuantity;

        switch (movementType) {
          case "receipt":
            newQuantity = previousQuantity + quantity;
            break;
          case "issue":
            if (quantity > previousQuantity) {
              return res.status(400).json({ error: `Cannot issue ${quantity} units. Only ${previousQuantity} available.` });
            }
            newQuantity = previousQuantity - quantity;
            break;
          case "return":
            newQuantity = previousQuantity + quantity;
            break;
          case "adjustment":
            newQuantity = quantity;
            break;
          default:
            return res.status(400).json({ error: "Invalid movement type" });
        }

        await db
          .update(inventoryItems)
          .set({ quantity: newQuantity, updatedAt: new Date() })
          .where(eq(inventoryItems.id, itemId));

        const [movement] = await db.insert(inventoryMovements).values({
          itemId,
          movementType,
          quantity,
          previousQuantity,
          newQuantity,
          reference,
          remarks,
          performedBy,
        }).returning();

        const [auditUser] = await db.select().from(users).where(eq(users.id, performedBy));
        await logAudit("inventory_items", itemId, "stock_change", { quantity: previousQuantity, itemName: item.itemName, itemCode: item.itemCode }, { quantity: newQuantity, movementType, changeAmount: quantity, itemName: item.itemName, itemCode: item.itemCode }, performedBy, auditUser?.fullName || auditUser?.username || "Unknown");

        res.json(movement);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // ==================== AUDIT LOGS ====================

    app.get("/api/audit-logs", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        await db.delete(auditLogs).where(lt(auditLogs.timestamp, sevenDaysAgo));

        const logs = await db
          .select()
          .from(auditLogs)
          .orderBy(desc(auditLogs.timestamp))
          .limit(500);

        res.json(logs);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/audit-logs/:id/restore", requireRole("super_admin", "chairman"), async (req, res) => {
      try {
        const { id } = req.params;
        const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
        if (!log) return res.status(404).json({ error: "Audit log entry not found" });

        if (log.tableName !== "inventory_items") {
          return res.status(400).json({ error: "Restore only supported for inventory items" });
        }

        const prevData = log.previousData as any;
        if (!prevData) {
          return res.status(400).json({ error: "No previous data available to restore" });
        }

        if (log.action === "delete") {
          const { id: oldId, createdAt, updatedAt, ...restoreData } = prevData;
          const [existingByCode] = await db.select().from(inventoryItems).where(eq(inventoryItems.itemCode, restoreData.itemCode));
          if (existingByCode) {
            return res.status(400).json({ error: `Cannot restore: an item with code ${restoreData.itemCode} already exists` });
          }
          const [existingByFolio] = await db.select().from(inventoryItems).where(eq(inventoryItems.folioNumber, restoreData.folioNumber));
          if (existingByFolio) {
            return res.status(400).json({ error: `Cannot restore: an item with folio number ${restoreData.folioNumber} already exists` });
          }
          const host = `${req.protocol}://${req.get('host')}`;
          const qrData = `${host}/scan?code=${encodeURIComponent(restoreData.itemCode)}`;
          const qrCodeDataURL = await QRCode.toDataURL(qrData, { width: 300, margin: 2, color: { dark: '#0891B2', light: '#FFFFFF' } });
          const [restored] = await db.insert(inventoryItems).values({ ...restoreData, qrCode: qrCodeDataURL }).returning();
          const [auditUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
          await logAudit("inventory_items", restored.id, "restore", null, { itemName: restored.itemName, itemCode: restored.itemCode, restoredFrom: id }, req.session.userId!, auditUser?.fullName || auditUser?.username || "Unknown");
          return res.json({ success: true, restored, message: "Deleted item has been restored" });
        }

        if (log.action === "update" || log.action === "stock_change") {
          const restoreFields: any = {};
          for (const key of Object.keys(prevData)) {
            if (key !== "itemName" && key !== "itemCode") {
              restoreFields[key] = prevData[key];
            }
          }
          restoreFields.updatedAt = new Date();
          const [restored] = await db.update(inventoryItems).set(restoreFields).where(eq(inventoryItems.id, log.recordId)).returning();
          if (!restored) {
            return res.status(404).json({ error: "Item no longer exists in inventory" });
          }
          const [auditUser] = await db.select().from(users).where(eq(users.id, req.session.userId!));
          await logAudit("inventory_items", log.recordId, "restore", null, { itemName: restored.itemName, itemCode: restored.itemCode, restoredFrom: id }, req.session.userId!, auditUser?.fullName || auditUser?.username || "Unknown");
          return res.json({ success: true, restored, message: "Item has been restored to previous state" });
        }

        return res.status(400).json({ error: "Cannot restore a creation event" });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/reports/summary", requireAuth, async (req, res) => {
      try {
        const [totalResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems);

        const [totalValue] = await db
          .select({ total: sql<string>`COALESCE(SUM(CAST(${inventoryItems.unitPrice} AS numeric) * ${inventoryItems.quantity}), 0)` })
          .from(inventoryItems);

        const [lowStockResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems)
          .where(sql`${inventoryItems.quantity} <= ${inventoryItems.minStockLevel}`);

        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60);

        const [expiringSoonResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(inventoryItems)
          .where(
            and(
              eq(inventoryItems.expiryApplicable, true),
              lt(inventoryItems.expiryDate, sixtyDaysFromNow)
            )
          );

        const [categoriesResult] = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(categories);

        const categoryBreakdown = await db
          .select({
            name: categories.name,
            count: sql<number>`COUNT(${inventoryItems.id})::int`,
          })
          .from(categories)
          .leftJoin(inventoryItems, eq(categories.id, inventoryItems.categoryId))
          .groupBy(categories.id, categories.name)
          .orderBy(desc(sql`COUNT(${inventoryItems.id})`));

        const recentMovements = await db
          .select({
            movement: inventoryMovements,
            itemName: inventoryItems.itemName,
            itemCode: inventoryItems.itemCode,
            userName: users.username,
          })
          .from(inventoryMovements)
          .leftJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
          .leftJoin(users, eq(inventoryMovements.performedBy, users.id))
          .orderBy(desc(inventoryMovements.timestamp))
          .limit(20);

        const movementStats = await db
          .select({
            type: inventoryMovements.movementType,
            count: sql<number>`COUNT(*)::int`,
          })
          .from(inventoryMovements)
          .groupBy(inventoryMovements.movementType);

        res.json({
          totalItems: totalResult.count,
          totalValue: totalValue.total,
          lowStockItems: lowStockResult.count,
          expiringSoon: expiringSoonResult.count,
          totalCategories: categoriesResult.count,
          categoryBreakdown,
          recentMovements,
          movementStats,
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/inventory/regenerate-qr", requireRole("super_admin"), async (req, res) => {
      try {
        const allItems = await db.select().from(inventoryItems);
        const host = `${req.protocol}://${req.get('host')}`;
        let count = 0;

        for (const item of allItems) {
          const qrData = `${host}/scan?code=${encodeURIComponent(item.itemCode)}`;
          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: { dark: '#0891B2', light: '#FFFFFF' },
          });
          await db.update(inventoryItems).set({ qrCode: qrCodeDataURL }).where(eq(inventoryItems.id, item.id));
          count++;
        }

        res.json({ success: true, updated: count });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post("/api/admin/migrate-data", requireAuth, async (req: Request, res: Response) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.id, req.session!.userId!));
        if (!user || user.role !== "super_admin") {
          return res.status(403).json({ error: "Super admin only" });
        }

        const { migrationKey, categoriesData, itemsData, movementsData } = req.body;
        if (migrationKey !== "kcd-migrate-2026") {
          return res.status(403).json({ error: "Invalid migration key" });
        }

        let catCount = 0, itemCount = 0, movCount = 0;

        if (categoriesData && categoriesData.length) {
          for (const c of categoriesData) {
            const existing = await db.select().from(categories).where(eq(categories.id, c.id));
            if (existing.length === 0) {
              await db.insert(categories).values({
                id: c.id,
                name: c.name,
                code: c.code,
                description: c.description || null,
              });
              catCount++;
            }
          }
        }

        if (itemsData && itemsData.length) {
          for (const i of itemsData) {
            const existing = await db.select().from(inventoryItems).where(eq(inventoryItems.id, i.id));
            if (existing.length === 0) {
              await db.insert(inventoryItems).values({
                id: i.id,
                itemCode: i.item_code,
                folioNumber: i.folio_number || null,
                itemName: i.item_name,
                categoryId: i.category_id,
                quantity: i.quantity,
                minStockLevel: i.min_stock_level,
                unitPrice: i.unit_price || null,
                expiryApplicable: i.expiry_applicable ?? false,
                expiryDate: i.expiry_date || null,
                batchNumber: i.batch_number || null,
                supplier: i.supplier || null,
                location: i.location || null,
                notes: i.notes || null,
                qrCode: i.qr_code || null,
                unit: i.unit || "piece",
                createdBy: i.created_by || null,
              });
              itemCount++;
            }
          }
        }

        if (movementsData && movementsData.length) {
          for (const m of movementsData) {
            const existing = await db.select().from(inventoryMovements).where(eq(inventoryMovements.id, m.id));
            if (existing.length === 0) {
              await db.insert(inventoryMovements).values({
                id: m.id,
                itemId: m.item_id,
                movementType: m.movement_type,
                quantity: m.quantity,
                previousQuantity: m.previous_quantity,
                newQuantity: m.new_quantity,
                reference: m.reference || null,
                remarks: m.remarks || null,
                performedBy: m.performed_by || null,
              });
              movCount++;
            }
          }
        }

        res.json({ success: true, inserted: { categories: catCount, items: itemCount, movements: movCount } });
      } catch (error: any) {
        console.error("Migration error:", error);
        res.status(500).json({ error: error.message });
      }
    });
  }
  