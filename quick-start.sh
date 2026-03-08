#!/bin/bash

  echo "🚀 KCD Dental Inventory System - Quick Start"
  echo "============================================"
  echo ""

  echo "📦 Step 1: Installing dependencies..."
  npm install

  echo ""
  echo "🗄️  Step 2: Initializing database..."
  npx tsx server/init-db.ts

  echo ""
  echo "🌱 Step 3: Seeding data from Excel..."
  npx tsx server/seed.ts

  echo ""
  echo "✅ Setup complete!"
  echo ""
  echo "🎉 You can now run the application with: npm run dev"
  echo ""
  echo "📱 The system will be available at:"
  echo "   - Frontend: http://localhost:5000"
  echo "   - Backend API: http://localhost:5000/api"
  echo ""
  echo "🔐 Default login:"
  echo "   Username: admin"
  echo "   Password: admin123"
  echo ""
  