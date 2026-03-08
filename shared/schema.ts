import { sql } from "drizzle-orm";
  import { pgTable, text, varchar, integer, timestamp, boolean, decimal, jsonb } from "drizzle-orm/pg-core";
  import { createInsertSchema } from "drizzle-zod";
  import { z } from "zod";

  export const USER_ROLES = ["super_admin", "chairman", "faculty", "clerk", "lab_assistant", "student"] as const;
  export type UserRole = typeof USER_ROLES[number];

  export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    fullName: text("full_name"),
    email: text("email"),
    role: varchar("role", { length: 20 }).notNull().default("student"),
    isProtected: boolean("is_protected").default(false).notNull(),
    mustChangePassword: boolean("must_change_password").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // Categories table
  export const categories = pgTable("categories", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull().unique(),
    code: varchar("code", { length: 20 }).notNull().unique(), // e.g., "ENDO", "RESTO", "CLEAN"
    description: text("description"),
    itemCount: integer("item_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // Inventory items table
  export const inventoryItems = pgTable("inventory_items", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    itemCode: varchar("item_code", { length: 50 }).notNull().unique(), // KCD-ENDO-001
    folioNumber: varchar("folio_number", { length: 50 }).notNull().unique(),
    itemName: text("item_name").notNull(),
    categoryId: varchar("category_id").references(() => categories.id).notNull(),
    
    // Stock information
    quantity: integer("quantity").default(0).notNull(),
    unit: varchar("unit", { length: 30 }).default("piece").notNull(),
    minStockLevel: integer("min_stock_level").default(10),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
    
    // Expiry tracking
    expiryApplicable: boolean("expiry_applicable").default(false).notNull(),
    expiryDate: timestamp("expiry_date"),
    batchNumber: varchar("batch_number", { length: 100 }),
    
    // Metadata
    supplier: text("supplier"),
    location: text("location"),
    notes: text("notes"),
    qrCode: text("qr_code"), // Base64 encoded QR code image
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: varchar("created_by").references(() => users.id),
  });

  // Inventory movements/transactions log
  export const inventoryMovements = pgTable("inventory_movements", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    itemId: varchar("item_id").references(() => inventoryItems.id).notNull(),
    movementType: varchar("movement_type", { length: 20 }).notNull(), // "issue", "receipt", "adjustment", "return"
    quantity: integer("quantity").notNull(),
    previousQuantity: integer("previous_quantity").notNull(),
    newQuantity: integer("new_quantity").notNull(),
    reference: text("reference"), // PO number, requisition number, etc.
    remarks: text("remarks"),
    performedBy: varchar("performed_by").references(() => users.id).notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  });

  export const auditLogs = pgTable("audit_logs", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    tableName: varchar("table_name", { length: 50 }).notNull(),
    recordId: varchar("record_id").notNull(),
    action: varchar("action", { length: 20 }).notNull(),
    previousData: jsonb("previous_data"),
    newData: jsonb("new_data"),
    userId: varchar("user_id").references(() => users.id),
    userDisplayName: text("user_display_name"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  });

  // Zod schemas for validation
  export const insertUserSchema = createInsertSchema(users).pick({
    username: true,
    password: true,
    fullName: true,
    email: true,
    role: true,
  });

  export const insertCategorySchema = createInsertSchema(categories).omit({
    id: true,
    createdAt: true,
    itemCount: true,
  });

  export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

  export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({
    id: true,
    timestamp: true,
  });

  // TypeScript types
  export type InsertUser = z.infer<typeof insertUserSchema>;
  export type User = typeof users.$inferSelect;

  export type InsertCategory = z.infer<typeof insertCategorySchema>;
  export type Category = typeof categories.$inferSelect;

  export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
  export type InventoryItem = typeof inventoryItems.$inferSelect;

  export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
  export type InventoryMovement = typeof inventoryMovements.$inferSelect;

  export type AuditLog = typeof auditLogs.$inferSelect;
  