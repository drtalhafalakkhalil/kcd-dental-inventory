import { db } from "./db";
import { categories, inventoryItems, users } from "../shared/schema";
import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

function generateUniqueCode(name: string, existingCodes: Set<string>): string {
  const clean = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  let code = '';
  if (words.length >= 2) {
    code = words.map(w => w.substring(0, 3)).join('').substring(0, 6);
  } else {
    code = clean.replace(/\s/g, '').substring(0, 6);
  }
  code = code || 'GEN';

  let finalCode = code;
  let counter = 2;
  while (existingCodes.has(finalCode)) {
    finalCode = code.substring(0, 5) + counter;
    counter++;
  }
  existingCodes.add(finalCode);
  return finalCode;
}

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    const hashedPassword = await hashPassword("admin123");
    const [existing] = await db.select().from(users).where(eq(users.username, "talha"));
    if (!existing) {
      await db.insert(users).values({
        username: "talha",
        password: hashedPassword,
        fullName: "Dr. Talha Falak Khalil",
        email: "talha@kcd.edu.pk",
        role: "super_admin",
        isProtected: true,
      });
      console.log("✅ Super Admin user created (talha)");
    } else {
      console.log("⚠️  Super Admin user already exists");
    }
  } catch (error) {
    console.log("⚠️  Super Admin user might already exist");
  }

  try {
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, "admin"));
    if (existingAdmin) {
      const hashedPw = await hashPassword("admin123");
      await db.update(users).set({ password: hashedPw, role: "chairman", fullName: "Admin" }).where(eq(users.username, "admin"));
      console.log("✅ Existing admin user updated with hashed password");
    }
  } catch (error) {
    console.log("⚠️  Could not update existing admin");
  }

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

  console.log(`📊 Found ${data.length} items in Excel`);

  const existingCategories = await db.select().from(categories);
  const existingCodes = new Set(existingCategories.map(c => c.code));
  const categoryMap = new Map<string, string>();
  existingCategories.forEach(c => categoryMap.set(c.name, c.id));

  for (const row of data as any[]) {
    const categoryName = row.Category || 'Uncategorized';

    if (!categoryMap.has(categoryName)) {
      const categoryCode = generateUniqueCode(categoryName, existingCodes);

      try {
        const [category] = await db.insert(categories).values({
          name: categoryName,
          code: categoryCode,
          description: `Category for ${categoryName}`
        }).returning();

        categoryMap.set(categoryName, category.id);
        console.log(`  ✓ Created category: ${categoryName} (${categoryCode})`);
      } catch (error) {
        const [existing] = await db.select().from(categories).where(eq(categories.name, categoryName));
        if (existing) {
          categoryMap.set(categoryName, existing.id);
        } else {
          console.log(`  ✗ Failed to create category: ${categoryName}`);
        }
      }
    }
  }

  console.log(`✅ ${categoryMap.size} categories ready`);

  let imported = 0;
  let skipped = 0;
  const existingItemCodes = new Set<string>();
  const existingItems = await db.select({ code: inventoryItems.itemCode, folio: inventoryItems.folioNumber }).from(inventoryItems);
  existingItems.forEach(i => { existingItemCodes.add(i.code); });
  const existingFolios = new Set(existingItems.map(i => i.folio));

  for (const row of data as any[]) {
    try {
      const categoryName = row.Category || 'Uncategorized';
      const categoryId = categoryMap.get(categoryName);

      if (!categoryId) {
        console.log(`⚠️  Skipping item (no category): ${row['Item Name']}`);
        skipped++;
        continue;
      }

      const folioNum = row['Folio No.'];
      const folioStr = folioNum != null ? String(folioNum) : '';
      if (!folioStr) {
        console.log(`⚠️  Skipping item (no folio): ${row['Item Name']}`);
        skipped++;
        continue;
      }

      if (existingFolios.has(folioStr)) {
        skipped++;
        continue;
      }

      const categoryCodePrefix = categoryName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'GEN';
      let itemCode = `KCD-${categoryCodePrefix}-${String(row['Code No.'] || folioStr).padStart(3, '0')}`;
      let codeSuffix = 2;
      while (existingItemCodes.has(itemCode)) {
        itemCode = `KCD-${categoryCodePrefix}-${String(row['Code No.'] || folioStr).padStart(3, '0')}-${codeSuffix}`;
        codeSuffix++;
      }
      existingItemCodes.add(itemCode);

      const qrData = JSON.stringify({
        code: itemCode,
        name: row['Item Name'],
        folio: folioStr
      });

      const qrCodeDataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0891B2',
          light: '#FFFFFF'
        }
      });

      await db.insert(inventoryItems).values({
        itemCode,
        folioNumber: folioStr,
        itemName: row['Item Name'],
        categoryId,
        expiryApplicable: row['Expiry Applicable'] === 'Yes',
        quantity: 0,
        qrCode: qrCodeDataURL,
      });

      existingFolios.add(folioStr);
      imported++;

      if (imported % 10 === 0) {
        console.log(`  📦 Imported ${imported} items...`);
      }
    } catch (error: any) {
      console.log(`⚠️  Error importing "${row['Item Name']}": ${error.message}`);
      skipped++;
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`  📦 Imported: ${imported} items`);
  console.log(`  ⏭️  Skipped: ${skipped} items (already existed or issues)`);
}

seed().catch(console.error);
