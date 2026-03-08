import { drizzle } from "drizzle-orm/node-postgres";
  import { migrate } from "drizzle-orm/node-postgres/migrator";
  import pg from "pg";

  const { Pool } = pg;

  async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error("❌ DATABASE_URL not found");
      process.exit(1);
    }

    const pool = new Pool({
      connectionString,
    });

    const db = drizzle(pool);
    
    console.log("🔄 Initializing database...");
    
    try {
      // Create tables using raw SQL
      await pool.query(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'viewer',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Categories table
        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          code VARCHAR(20) NOT NULL UNIQUE,
          description TEXT,
          item_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Inventory items table
        CREATE TABLE IF NOT EXISTS inventory_items (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          item_code VARCHAR(50) NOT NULL UNIQUE,
          folio_number VARCHAR(50) NOT NULL UNIQUE,
          item_name TEXT NOT NULL,
          category_id VARCHAR REFERENCES categories(id) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          min_stock_level INTEGER DEFAULT 10,
          unit_price DECIMAL(10,2),
          expiry_applicable BOOLEAN NOT NULL DEFAULT false,
          expiry_date TIMESTAMP,
          batch_number VARCHAR(100),
          supplier TEXT,
          location TEXT,
          notes TEXT,
          qr_code TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by VARCHAR REFERENCES users(id)
        );

        -- Inventory movements table
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          item_id VARCHAR REFERENCES inventory_items(id) NOT NULL,
          movement_type VARCHAR(20) NOT NULL,
          quantity INTEGER NOT NULL,
          previous_quantity INTEGER NOT NULL,
          new_quantity INTEGER NOT NULL,
          reference TEXT,
          remarks TEXT,
          performed_by VARCHAR REFERENCES users(id) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      
      console.log("✅ Database tables created successfully!");
      
      await pool.end();
    } catch (error) {
      console.error("Error:", error);
      await pool.end();
      process.exit(1);
    }
  }

  initDatabase();
  