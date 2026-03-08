import { Pool } from 'pg';
  import ExcelJS from 'exceljs';
  import QRCode from 'qrcode';

  async function startup() {
    console.log('🎬 KCD Dental Inventory System - Startup');
    console.log('═══════════════════════════════════════════════\n');

    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('❌ DATABASE_URL environment variable not found');
      process.exit(1);
    }

    const pool = new Pool({ connectionString });

    try {
      // Step 1: Create tables
      console.log('🗄️  Step 1: Creating database tables...\n');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'viewer',
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS categories (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          code VARCHAR(20) NOT NULL UNIQUE,
          description TEXT,
          item_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

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
      
      console.log('✅ Tables created!\n');

      // Step 2: Create admin user
      console.log('👤 Step 2: Creating admin user...\n');
      
      try {
        const adminResult = await pool.query(
          'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username',
          ['admin', 'admin123', 'admin']
        );
        console.log(`✅ Admin user created: ${adminResult.rows[0].username}\n`);
      } catch (error) {
        if (error.code === '23505') {
          console.log('✅ Admin user already exists\n');
        } else {
          throw error;
        }
      }

      // Step 3: Import Excel data
      console.log('📊 Step 3: Importing your Excel data...\n');
      
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile('attached_assets/KCD_Master_Inventory_Final_1772528810497.xlsx');
      const worksheet = workbook.worksheets[0];
      const data: any[] = [];
      const excelHeaders: string[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) {
          (row.values as any[]).forEach((val, idx) => { excelHeaders[idx] = String(val ?? ''); });
        } else {
          const obj: any = {};
          (row.values as any[]).forEach((val, idx) => {
            if (excelHeaders[idx]) obj[excelHeaders[idx]] = val;
          });
          data.push(obj);
        }
      });
      
      console.log(`   Found ${data.length} items in Excel\n`);

      // Create categories with better error handling
      const categoryMap = new Map();
      const uniqueCategories = [...new Set(data.map((row) => row.Category || 'Uncategorized'))];
      
      console.log('   Creating categories...\n');
      
      for (const categoryName of uniqueCategories) {
        const categoryCode = categoryName
          .toUpperCase()
          .replace(/[^A-Z]/g, '')
          .substring(0, 6) || 'GEN';
        
        try {
          // First check if category exists
          const existingCheck = await pool.query(
            'SELECT id FROM categories WHERE name = $1',
            [categoryName]
          );
          
          if (existingCheck.rows.length > 0) {
            // Category exists, use it
            categoryMap.set(categoryName, existingCheck.rows[0].id);
            console.log(`   ✓ Found existing category: ${categoryName}`);
          } else {
            // Create new category
            const result = await pool.query(
              'INSERT INTO categories (name, code, description) VALUES ($1, $2, $3) RETURNING id',
              [categoryName, categoryCode, `Category for ${categoryName}`]
            );
            
            if (result.rows && result.rows[0] && result.rows[0].id) {
              categoryMap.set(categoryName, result.rows[0].id);
              console.log(`   ✓ Created category: ${categoryName}`);
            } else {
              console.log(`   ⚠️  Warning: Could not create category ${categoryName}`);
            }
          }
        } catch (error) {
          console.log(`   ⚠️  Error with category ${categoryName}: ${error.message}`);
          // Try to get existing one
          try {
            const fallback = await pool.query(
              'SELECT id FROM categories WHERE name = $1',
              [categoryName]
            );
            if (fallback.rows.length > 0) {
              categoryMap.set(categoryName, fallback.rows[0].id);
            }
          } catch (e) {
            console.log(`   ⚠️  Could not recover category ${categoryName}`);
          }
        }
      }
      
      console.log(`\n✅ Processed ${categoryMap.size} categories\n`);

      // Import items with better error handling
      let imported = 0;
      let skipped = 0;
      
      console.log('   Importing items...\n');
      
      for (const row of data) {
        try {
          const categoryName = row.Category || 'Uncategorized';
          const categoryId = categoryMap.get(categoryName);
          
          if (!categoryId) {
            console.log(`   ⚠️  Skipping item "${row['Item Name']}" - no category ID for ${categoryName}`);
            skipped++;
            continue;
          }
          
          // Check if already exists
          const existing = await pool.query(
            'SELECT id FROM inventory_items WHERE folio_number = $1',
            [String(row['Folio No.'])]
          );
          
          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }
          
          // Generate item code
          const categoryCodePrefix = categoryName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'GEN';
          const itemCode = `KCD-${categoryCodePrefix}-${String(row['Code No.'] || row['Folio No.']).padStart(3, '0')}`;
          
          // Generate QR code
          const qrData = JSON.stringify({
            code: itemCode,
            name: row['Item Name'],
            folio: row['Folio No.']
          });
          
          const qrCodeDataURL = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: {
              dark: '#0891B2',
              light: '#FFFFFF'
            }
          });
          
          await pool.query(
            `INSERT INTO inventory_items 
             (item_code, folio_number, item_name, category_id, expiry_applicable, quantity, qr_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              itemCode,
              String(row['Folio No.']),
              row['Item Name'],
              categoryId,
              row['Expiry Applicable'] === 'Yes',
              0,
              qrCodeDataURL
            ]
          );
          
          imported++;
          
          if (imported % 20 === 0) {
            console.log(`   📦 Imported ${imported} items...`);
          }
        } catch (error) {
          console.log(`   ⚠️  Error importing "${row['Item Name']}": ${error.message}`);
          skipped++;
        }
      }
      
      console.log(`\n✅ Import complete!`);
      console.log(`   📦 Imported: ${imported} items`);
      console.log(`   ⏭️  Skipped: ${skipped} items\n`);

      console.log('═══════════════════════════════════════════════');
      console.log('🎉 SETUP COMPLETE! Your system is ready!\n');
      console.log('🌐 Application will start next...');
      console.log('   Open: http://localhost:5000\n');
      console.log('🔐 Login credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123\n');
      console.log('═══════════════════════════════════════════════\n');

      await pool.end();
    } catch (error) {
      console.error('❌ Error during startup:', error);
      await pool.end();
      process.exit(1);
    }
  }

  startup();
  