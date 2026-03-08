# KCD Digital Inventory System
## Dental Materials Department, Khyber College of Dentistry

**Developed by:** Dr. Talha Falak Khalil  
**Department:** Dental Materials, Khyber College of Dentistry  

---

## What Is This Project?

This is a complete **digital inventory management system** built specifically for the Dental Materials Department at Khyber College of Dentistry. It replaces manual stock registers with a modern web application that tracks every dental material — from receipt to issuance — with full accountability and real-time visibility.

---

## Step-by-Step: What the System Does

### Step 1: User Login & Access Control

- Every user has a unique username and password.
- The system has **6 roles** with different permissions:
  1. **Super Admin** — Full control over everything (Dr. Talha Falak Khalil).
  2. **Chairman** — Department chairman with near-full authority.
  3. **Faculty** — Can view inventory, record stock movements, and manage data entries.
  4. **Clerk** — Handles issuance and stock movements.
  5. **Lab Assistant** — Issues/returns items, views inventory, manages data entries.
  6. **Student** — View-only access to see what materials are available.
- When a new user is created by an admin, they must set up their own password on first login.
- Students can self-register through the login page (view-only access).

### Step 2: Dashboard Overview

- After logging in, the **Dashboard** shows at a glance:
  - Total number of inventory items
  - Total inventory value
  - Items running low on stock
  - Items expiring soon
  - Category breakdown (pie chart)
  - Recent stock movements (activity feed)
  - Monthly movement trends (bar chart)

### Step 3: Inventory Management

- Every dental material is tracked with:
  - **Item Code** — Unique identifier
  - **Folio Number** — Register reference number
  - **Name, Category, Location** — Where and what it is
  - **Current Quantity & Minimum Stock Level** — Triggers low-stock alerts
  - **Unit** — Piece, box, pack, bottle, tube, roll, set, pair, sheet, cartridge
  - **Unit Price** — For value calculations
  - **Supplier, Batch Number** — Procurement tracking
  - **Expiry Date** — For items that expire (dental materials, chemicals)
  - **QR Code** — Auto-generated for each item
- Items can be **added, edited, and deleted** (with role-based permissions).
- All changes are recorded in the **Audit Trail**.

### Step 4: Stock Movements

- Every stock change is recorded as a **movement**:
  - **Receipt** — New stock received (increases quantity)
  - **Issue** — Stock given out (decreases quantity)
  - **Return** — Stock returned (increases quantity)
  - **Adjustment** — Manual correction (sets quantity directly)
- Each movement records: who did it, when, how much, reference number, and remarks.
- Stock quantities update automatically after each movement.

### Step 5: QR Code Scanning (Mobile-Friendly)

- Every item gets a **QR code** that encodes a URL.
- Scanning the QR code with any phone camera opens a **mobile-friendly page** showing:
  - Item name and current stock (large, easy to read)
  - Stock status (in stock, low stock, out of stock)
  - Category, location, supplier, expiry date
  - Recent movements for that item
- Authenticated users can **Restock** or **Issue** items directly from the scan page.
- No app installation needed — works in any mobile browser.

### Step 6: Excel Import (Bulk Data Entry)

- Upload an Excel file (.xlsx) to import items in bulk.
- The system reads columns like Item Code, Folio Number, Name, Category, Quantity, etc.
- Categories are auto-created if they don't exist.
- Duplicate items (same item code) are skipped to prevent duplicates.
- Super Admins and Chairmen can perform bulk imports.

### Step 7: Reports & Analytics

- **Stock Summary** — Overview of all items with values and quantities.
- **Low Stock Report** — Items below their minimum stock level.
- **Expiry Report** — Items expiring within 90 days.
- **Movement History** — Complete log of all stock movements.
- **Category Breakdown** — Items and values per category.

### Step 8: Audit Trail

- Every inventory change is logged automatically:
  - **Create** — New item added
  - **Update** — Item details changed (shows what changed)
  - **Delete** — Item removed (stores previous data)
  - **Stock Change** — Quantity changed via movement
- The audit trail shows: who made the change, when, and what exactly changed.
- **Restore feature** — Super Admin can restore deleted items or revert changes from the audit trail.
- Logs are kept for 7 days and auto-cleaned.

### Step 9: User Management

- Super Admin and Chairman can create, edit, and delete user accounts.
- Role hierarchy is enforced — you can only manage users of a lower role.
- The Super Admin account (Dr. Talha) is **protected** and cannot be modified or deleted by anyone.

### Step 10: Categories

- Items are organized into categories (e.g., "Impression Materials", "Cements", "Instruments").
- Each category has a unique code and optional description.
- Categories show item counts.
- Faculty, Lab Assistants, and above can manage categories.

---

## Technical Summary

| Component | Technology |
|-----------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Express.js, TypeScript, Drizzle ORM |
| Database | PostgreSQL (Neon in production) |
| Authentication | Session-based (express-session) |
| QR Codes | Generated as data URLs with scan links |
| Excel Import | ExcelJS library |
| Charts | Recharts |
| Hosting | Replit Autoscale Deployment |

---

## Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `talha` | `admin123` | Super Admin |
| `admin` | `admin123` | Chairman |

**Important:** Change the default passwords after first login for security.

---

## Database Tables

1. **users** — All system users with roles and permissions
2. **categories** — Item categories
3. **inventory_items** — All tracked dental materials
4. **inventory_movements** — Stock movement records
5. **audit_logs** — Change history for accountability
6. **user_sessions** — Login session management

---

## Key URLs

- `/` — Dashboard (after login)
- `/inventory` — Inventory list with search, filter, add, edit, delete
- `/movements` — Stock movement history and recording
- `/reports` — Reports and analytics
- `/import` — Excel file import
- `/users` — User management
- `/settings` — System settings and categories
- `/audit` — Audit trail with restore
- `/scan?code=ITEM_CODE` — Mobile QR scan page (no login required to view)
