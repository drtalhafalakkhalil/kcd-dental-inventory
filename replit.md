# KCD Dental Inventory Management System

## Overview
Complete inventory management system for the **Dental Materials Department, Khyber College of Dentistry**. Built by Dr. Talha Falak Khalil.

## Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts, Shadcn UI, Wouter (routing), TanStack Query v5
- **Backend**: Express.js 5, TypeScript, Drizzle ORM, PostgreSQL
- **Auth**: express-session + connect-pg-simple (session table: `user_sessions`), scrypt password hashing
- **Other**: ExcelJS (Excel import), QRCode generation, Multer (file uploads)

## Project Structure
```
client/src/
  pages/
    login.tsx               - Login page (dental-themed, gradient design)
    dashboard.tsx           - Main overview with stats, charts, alerts, activity feed
    inventory-list.tsx      - Full CRUD for inventory items (add, edit, delete, QR codes)
    stock-movements.tsx     - Record issues, receipts, returns, adjustments
    excel-import.tsx        - Bulk import from Excel files
    reports.tsx             - Stock summaries, low stock, expiry, movement history
    settings.tsx            - System info, category management, about/credits
    user-management.tsx     - User CRUD (create/edit/delete users, role assignment)
    not-found.tsx           - 404 page
  hooks/
    use-auth.tsx            - AuthProvider context + useAuth hook (login, logout, role checks)
    use-toast.ts            - Toast notifications hook
  components/
    welcome-dialog.tsx      - First-visit welcome popup with instructions and credits
    error-boundary.tsx      - Error boundary with auto-reset on navigation
    ui/                     - Shadcn UI components
  App.tsx                   - Router + sidebar navigation layout + auth gating

server/
  routes.ts                - All API endpoints (auth + user CRUD + inventory/movements/reports)
  auth.ts                  - Password hashing (hashPassword/comparePasswords with scrypt)
  db.ts                    - Database connection
  seed.ts                  - Database seeder from Excel
  index.ts                 - Server entry point (express-session middleware)
  vite.ts                  - Vite dev server setup

shared/
  schema.ts                - Drizzle ORM schema (users, categories, inventory_items, inventory_movements)

startup.ts                 - Initial setup script
```

## Authentication & Authorization

### Role Hierarchy (highest→lowest)
1. **super_admin** (6) — Dr. Talha Falak Khalil only. isProtected=true. Cannot be deleted/modified by anyone.
2. **chairman** (5) — Department Chairman. Full authority except cannot touch super_admin.
3. **faculty** (4) — Faculty members. View inventory, record movements, view reports.
4. **clerk** (3) — Add/edit items, record movements, import Excel, manage categories.
5. **lab_assistant** (2) — Issue/return items, view inventory.
6. **student** (1) — View-only access.

### Default Users
- `talha` / `admin123` — Super Admin (Dr. Talha Falak Khalil, isProtected: true)
- `admin` / `admin123` — Chairman

### Middleware
- `requireAuth` — Checks session.userId exists
- `requireRole(...roles)` — Checks user role is in allowed list

### Route Permissions
- View inventory/reports: all authenticated roles
- Add/edit items (data entry): super_admin, chairman, faculty, lab_assistant
- Delete items: super_admin, chairman only
- Record movements (issuance): super_admin, chairman, faculty, clerk, lab_assistant
- Import Excel (bulk): super_admin, chairman only
- Manage categories: super_admin, chairman, faculty, lab_assistant
- Manage users: super_admin, chairman (with hierarchy guards)
- Settings: super_admin, chairman
- Note: Clerks handle issuance/movements only (not data entry). Faculty & lab assistants handle data entry.

### First-Login Setup
- When admin creates a user via POST /api/users, `mustChangePassword` is set to `true`
- On login, if `mustChangePassword` is true, the app shows the Account Setup page instead of the main app
- User sets their own password, email, and full name via POST /api/auth/setup-account
- After setup, `mustChangePassword` is set to false and user enters the app normally

### Student Self-Registration
- Login page has a "Register as Student" button
- Public endpoint POST /api/auth/register-student creates a student account (view-only)
- Students set their own password during registration (no mustChangePassword needed)

### Audit Trail (Activity Log)
- `audit_logs` table tracks all inventory changes: create, update, delete, stock_change, restore
- Stores: who did it, what changed, previous data, new data, timestamp
- GET /api/audit-logs — super_admin/chairman only, returns last 7 days (auto-cleans older)
- POST /api/audit-logs/:id/restore — super_admin only, restores item to previous state
- Restore works for: deleted items (re-creates them), updates (reverts changed fields), stock changes (reverts quantity)
- Frontend page at /audit with timeline view, filter buttons, and restore buttons

### Frontend Auth
- AuthProvider wraps entire app, checks `/api/auth/me` on load
- If not authenticated, shows Login page (no routing needed)
- If `mustChangePassword` is true, shows Account Setup page
- useAuth hook provides: user, login, logout, hasRole, canEditInventory, canDeleteInventory, canRecordMovements, canImportExcel, canManageUsers, canManageCategories
- Sidebar items filtered by permissions
- Action buttons (add/edit/delete) hidden based on role

## Key API Endpoints
### Auth
- `POST /api/auth/login` — Login with username/password
- `GET /api/auth/me` — Current user info from session
- `POST /api/auth/logout` — Destroy session
- `POST /api/auth/setup-account` — First-login password/email setup (authenticated, mustChangePassword users)
- `POST /api/auth/register-student` — Public student self-registration

### Users
- `GET /api/users` — All users (authenticated)
- `POST /api/users` — Create user (super_admin/chairman only)
- `PUT /api/users/:id` — Update user (with role hierarchy guard)
- `DELETE /api/users/:id` — Delete user (protected users can't be deleted)

### Inventory & Data
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/inventory` - All items with category info
- `GET /api/inventory/lookup?code=X&folio=Y` - Look up item by code or folio (public, no auth — used by scan page)
- `GET /api/inventory/low-stock` - Items below min stock level
- `GET /api/inventory/expiring` - Items expiring within 90 days
- `POST /api/inventory` - Create item (auto-generates QR code with scan URL)
- `PUT /api/inventory/:id` - Update item
- `DELETE /api/inventory/:id` - Delete item
- `POST /api/inventory/import/excel` - Bulk import from Excel
- `POST /api/inventory/regenerate-qr` - Regenerate all QR codes with scan URLs (super_admin only)
- `GET /api/categories` - All categories with item counts
- `POST /api/categories` - Create category
- `GET /api/movements` - Movement history with item/user details
- `POST /api/movements` - Record movement (updates item quantity, performedBy = user ID)
- `GET /api/reports/summary` - Comprehensive report data
- `GET /api/audit-logs` - Audit trail (super_admin/chairman, last 7 days)
- `POST /api/audit-logs/:id/restore` - Restore item from audit log (super_admin only)

## QR Code Scan Page
- Route: `/scan?code=ITEM_CODE` — standalone mobile-friendly page
- Accessible without login (shows item info). Login required to restock/issue
- QR codes encode URL: `{host}/scan?code={itemCode}` — when scanned with phone camera, opens directly in browser
- Shows: item name, current stock (large), stock status badge, category, location, supplier, expiry, recent movements
- Actions (authenticated users with movement permissions): Restock (receipt) and Issue buttons with inline form
- Form pre-fills user identity, shows stock calculation preview before confirming
- `POST /api/inventory/regenerate-qr` available to re-encode all existing QR codes as URLs

## Database Schema
6 tables: `users`, `categories`, `inventory_items`, `inventory_movements`, `user_sessions`, `audit_logs`
- Users table has: id, username, password, fullName, email, role, isProtected, mustChangePassword, createdAt
- Audit logs table: id, tableName, recordId, action, previousData (jsonb), newData (jsonb), userId, userDisplayName, timestamp
- Stock movements automatically update item quantities
- Movement types: issue (decrease), receipt (increase), return (increase), adjustment (set)
- Sessions managed by connect-pg-simple in `user_sessions` table

## Important Notes
- **Production URL**: Always use the `.replit.app` domain (e.g., `https://xxx.replit.app/`). The `riker.prod.repl.run` URLs are per-deployment previews and may point to old code.
- **Database connection in production**: db.ts parses DATABASE_URL manually and passes explicit host/port/user/password/database to the Pool constructor. This prevents the `pg` library from falling back to internal dev hostnames (like `helium`) via pg.defaults or PGHOST env vars. All PG* env vars and pg.defaults are cleared in production before pool creation.
- Route ordering: specific routes (`/api/inventory/low-stock`, `/api/inventory/expiring`) MUST come before `/api/inventory/:id`
- `unit` column added via ALTER TABLE (piece, box, pack, bottle, etc.) — schema.ts updated
- Welcome dialog uses `sessionStorage` key `kcd_welcome_dismissed` (shows each new browser session)
- CSS HSL variables in index.css: background 210 20% 98%, primary 187 85% 43% (cyan/teal), sidebar 197 71% 20%
- DB has 104 items / 16 categories; "Glue stick" (row 103) missing folio in Excel — not imported
- Category code generation uses `generateUniqueCode()` to avoid collisions (e.g. "Office*" categories)
- ErrorBoundary wraps all routes with `key={location}` (auto-resets on navigation)
- Session secret: `SESSION_SECRET` env var (fallback: hardcoded default)
- Super Admin (talha) has isProtected=true — hardcoded guard prevents any modification/deletion

## Next Session Reminders
- **Rename the Repl**: User needs to rename the project to `kcd-dental-inventory` (click project name in top-left → change name) so the URL becomes `kcd-dental-inventory.replit.app`. Remind the user at the start of the next session.
- **Work inside the webapp**: Next session focuses on working within the live app (not code), so guide the user through the app interface rather than code changes.
