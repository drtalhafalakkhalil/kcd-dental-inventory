#!/bin/bash

  echo "🔄 KCD Dental Inventory - Clean Restart"
  echo "═══════════════════════════════════════════════════════════"
  echo ""

  # Kill any existing processes
  echo "🛑 Stopping any running servers..."
  pkill -f "tsx server/index.ts" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  sleep 2

  # Clear the port
  echo "✅ Port cleared"
  echo ""

  # Start the server
  echo "🚀 Starting your dental inventory system..."
  echo ""
  npm run dev
  