# KCD Dental Inventory Management System

  A modern, feature-rich inventory management system specifically designed for dental clinics.

  ## Features

  ### Core Functionality
  - Master Inventory Database - Track 200+ dental materials and supplies
  - Category Management - 16 pre-configured categories
  - Excel Import/Export - Bulk import from existing spreadsheets
  - QR Code Generation - Automatic QR codes for every item
  - Expiry Tracking - Smart alerts for items expiring within 60 days
  - Low Stock Alerts - Automatic notifications
  - Audit Trail - Complete history of inventory movements

  ### User Experience
  - Animated Dashboard - Beautiful Framer Motion animations
  - Visual Analytics - Real-time charts
  - Advanced Search - Search by name, code, folio, or category
  - Responsive Design - Works on all devices
  - Role-Based Access - Admin, Staff, and Viewer roles

  ## Quick Start

  ### Automated Setup
  bash quick-start.sh

  ### Manual Setup

  1. Install Dependencies
  npm install

  2. Initialize Database
  npx tsx server/init-db.ts

  3. Seed Your Data
  npx tsx server/seed.ts

  4. Start the Application
  npm run dev

  5. Open in Browser
  http://localhost:5000

  ## Your Data

  Your Excel file contains:
  - 106 items across 16 categories
  - Folio numbers from 1 to 104
  - 44 items with expiry tracking

  ### Categories:
  1. Dental Material (27 items)
  2. Endodontic Material (3 items)
  3. Equipment (10 items)
  4. Office Supply (11 items)
  5. Furniture (13 items)
  ...and 11 more

  ## User Guide

  ### Dashboard
  - Total items in inventory
  - Low stock alerts
  - Items expiring soon
  - Category distribution chart

  ### Inventory Management
  1. View All Items - Click "Inventory"
  2. Search - Find items by name, code, or folio
  3. Filter - Select categories
  4. View QR Code - Click QR icon
  5. Edit/Delete - Action buttons

  ### Excel Import
  1. Click "Import Excel"
  2. Upload your Excel file
  3. Required columns: Code No., Item Name, Category, Folio No., Expiry Applicable
  4. Review import results

  ## API Endpoints

  ### Categories
  GET /api/categories - List all
  POST /api/categories - Create new

  ### Inventory
  GET /api/inventory - List all (with filters)
  POST /api/inventory - Create item
  PUT /api/inventory/:id - Update
  DELETE /api/inventory/:id - Delete

  ### Import
  POST /api/inventory/import/excel - Import Excel

  ### Dashboard
  GET /api/dashboard/stats - Statistics

  ## Tech Stack

  Frontend: React, TypeScript, Tailwind, Framer Motion, Recharts
  Backend: Express.js, PostgreSQL, Drizzle ORM
  Features: QR codes, Excel processing, File uploads

  ## Security Notes

  For Production:
  1. Change default admin password
  2. Enable password hashing
  3. Use environment variables
  4. Enable HTTPS
  5. Set up database backups

  ## Troubleshooting

  Database Issues:
  npx tsx server/init-db.ts

  Excel Import:
  - Check column names match exactly
  - No duplicate folio numbers
  - File must be .xlsx or .xls

  ## Made for KCD Dental Clinic
  