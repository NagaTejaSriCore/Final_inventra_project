import { sql } from "./pg";
import {
  products as seedProducts,
  categories as seedCategories,
  suppliers as seedSuppliers,
  users as seedUsers,
  purchaseRequests as seedPurchaseRequests,
  notifications as seedNotifications,
  staff as seedStaff,
} from "./mock-data";
import type {
  Product,
  Category,
  ProductBatch,
  Supplier,
  AppUser,
  PurchaseRequest,
  NotificationItem,
  StaffMember,
  AttendanceRecord,
} from "./types";

export interface NotificationPrefs {
  lowStock: boolean;
  expiry: boolean;
  transfers: boolean;
  aiDigest: boolean;
}

// ---------------------------------------------------------------------------
// Schema + one-time seeding. Every exported function below calls `ready()`
// first, which lazily creates tables (if they don't exist yet) and seeds
// them from mock-data (only if the table is empty) exactly once per running
// server process. No manual migration step required.
// ---------------------------------------------------------------------------
let schemaReady: Promise<void> | null = null;
function ready(): Promise<void> {
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null; // allow retry on the next call instead of caching a permanent failure
      throw err;
    });
  }
  return schemaReady;
}

async function initSchema() {
  await sql`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT,
    barcode TEXT,
    category TEXT,
    brand TEXT,
    batch TEXT,
    supplier TEXT,
    warehouse TEXT,
    shelf TEXT,
    stock INT DEFAULT 0,
    "minStock" INT DEFAULT 0,
    "maxStock" INT DEFAULT 0,
    unit TEXT,
    "mfgDate" TEXT,
    "expiryDate" TEXT,
    "lastRestocked" TEXT,
    "lastUpdated" TEXT,
    "healthScore" INT DEFAULT 0,
    status TEXT,
    image TEXT,
    description TEXT,
    "packageSize" TEXT,
    weight TEXT,
    manufacturer TEXT,
    "qrCode" TEXT,
    source TEXT
  )`;
  // Safe for both a brand-new database (no-op, the column is already in the
  // CREATE TABLE above) and an existing one from before this field existed
  // (adds it without touching any existing rows/data).
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS "modelNumber" TEXT`;

  await sql`CREATE TABLE IF NOT EXISTS product_batches (
    id TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL,
    barcode TEXT,
    "batchNumber" TEXT,
    "lotNumber" TEXT,
    quantity INT DEFAULT 0,
    "mfgDate" TEXT,
    "expiryDate" TEXT,
    mrp TEXT,
    "netWeight" TEXT,
    warehouse TEXT,
    "scannedBy" TEXT,
    "scannedAt" TEXT,
    "ocrConfidence" JSONB
  )`;

  await sql`CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    "productCount" INT DEFAULT 0,
    "totalStock" INT DEFAULT 0,
    color TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT,
    email TEXT,
    "productsSupplied" INT DEFAULT 0,
    reliability INT DEFAULT 0,
    "lastOrder" TEXT,
    status TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS app_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    warehouse TEXT,
    status TEXT,
    "lastActive" TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    product TEXT,
    quantity INT DEFAULT 0,
    "requestedBy" TEXT,
    warehouse TEXT,
    status TEXT,
    date TEXT,
    "estCost" NUMERIC DEFAULT 0
  )`;

  await sql`CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    category TEXT,
    message TEXT,
    time TEXT,
    read BOOLEAN DEFAULT false
  )`;

  await sql`CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    phone TEXT,
    email TEXT,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    status TEXT,
    "joinDate" TEXT,
    "avatarColor" TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    date TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    status TEXT,
    notes TEXT
  )`;

  await sql`CREATE TABLE IF NOT EXISTS notification_prefs (
    id INT PRIMARY KEY DEFAULT 1,
    "lowStock" BOOLEAN DEFAULT true,
    expiry BOOLEAN DEFAULT true,
    transfers BOOLEAN DEFAULT true,
    "aiDigest" BOOLEAN DEFAULT false
  )`;

  await seedIfEmpty();
}

async function seedIfEmpty() {
  const [productCount, categoryCount, supplierCount, userCount, prCount, notifCount, staffCount] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM products`,
    sql`SELECT COUNT(*)::int AS count FROM categories`,
    sql`SELECT COUNT(*)::int AS count FROM suppliers`,
    sql`SELECT COUNT(*)::int AS count FROM app_users`,
    sql`SELECT COUNT(*)::int AS count FROM purchase_requests`,
    sql`SELECT COUNT(*)::int AS count FROM notifications`,
    sql`SELECT COUNT(*)::int AS count FROM staff`,
  ]);

  if (categoryCount[0].count === 0) {
    await Promise.all(
      seedCategories.map(
        (c) =>
          sql`INSERT INTO categories (id, name, "productCount", "totalStock", color)
              VALUES (${c.id}, ${c.name}, ${c.productCount}, ${c.totalStock}, ${c.color})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (supplierCount[0].count === 0) {
    await Promise.all(
      seedSuppliers.map(
        (s) =>
          sql`INSERT INTO suppliers (id, name, contact, email, "productsSupplied", reliability, "lastOrder", status)
              VALUES (${s.id}, ${s.name}, ${s.contact}, ${s.email}, ${s.productsSupplied}, ${s.reliability}, ${s.lastOrder}, ${s.status})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (productCount[0].count === 0) {
    await Promise.all(
      seedProducts.map(
        (p) =>
          sql`INSERT INTO products (id, name, sku, barcode, category, brand, batch, supplier, warehouse, shelf, stock, "minStock", "maxStock", unit, "mfgDate", "expiryDate", "lastRestocked", "lastUpdated", "healthScore", status, image, description, "packageSize", weight, manufacturer, "qrCode", source)
              VALUES (${p.id}, ${p.name}, ${p.sku}, ${p.barcode}, ${p.category}, ${p.brand}, ${p.batch}, ${p.supplier}, ${p.warehouse}, ${p.shelf}, ${p.stock}, ${p.minStock}, ${p.maxStock}, ${p.unit}, ${p.mfgDate}, ${p.expiryDate}, ${p.lastRestocked}, ${p.lastUpdated}, ${p.healthScore}, ${p.status}, ${p.image || ""}, ${p.description || null}, ${p.packageSize || null}, ${p.weight || null}, ${p.manufacturer || null}, ${p.qrCode || null}, ${p.source || null})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (userCount[0].count === 0) {
    await Promise.all(
      seedUsers.map(
        (u) =>
          sql`INSERT INTO app_users (id, name, email, role, warehouse, status, "lastActive")
              VALUES (${u.id}, ${u.name}, ${u.email}, ${u.role}, ${u.warehouse}, ${u.status}, ${u.lastActive})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (prCount[0].count === 0) {
    await Promise.all(
      seedPurchaseRequests.map(
        (r) =>
          sql`INSERT INTO purchase_requests (id, product, quantity, "requestedBy", warehouse, status, date, "estCost")
              VALUES (${r.id}, ${r.product}, ${r.quantity}, ${r.requestedBy}, ${r.warehouse}, ${r.status}, ${r.date}, ${r.estCost})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (notifCount[0].count === 0) {
    await Promise.all(
      seedNotifications.map(
        (n) =>
          sql`INSERT INTO notifications (id, category, message, time, read)
              VALUES (${n.id}, ${n.category}, ${n.message}, ${n.time}, ${n.read})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  if (staffCount[0].count === 0) {
    await Promise.all(
      seedStaff.map(
        (s) =>
          sql`INSERT INTO staff (id, name, role, department, phone, email, "shiftStart", "shiftEnd", status, "joinDate", "avatarColor")
              VALUES (${s.id}, ${s.name}, ${s.role}, ${s.department}, ${s.phone}, ${s.email}, ${s.shiftStart}, ${s.shiftEnd}, ${s.status}, ${s.joinDate}, ${s.avatarColor})
              ON CONFLICT (id) DO NOTHING`
      )
    );
  }

  await sql`INSERT INTO notification_prefs (id, "lowStock", expiry, transfers, "aiDigest")
             VALUES (1, true, true, true, false)
             ON CONFLICT (id) DO NOTHING`;
}

// Adds a fresh alert to the notification feed — used so real actions (low
// stock, a new hire, a rejected PO...) actually surface as notifications
// instead of the feed only ever showing the original seed data.
export async function pushNotification(
  input: {
    category: NotificationItem["category"];
    message: string;
  }
): Promise<NotificationItem> {
  await ready();

  const item: NotificationItem = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category,
    message: input.message,
    time: "Just now",
    read: false,
  };

  const [inserted] = await sql`
    INSERT INTO notifications (id, category, message, time, read)
    VALUES (
      ${item.id},
      ${item.category},
      ${item.message},
      ${item.time},
      ${item.read}
    )
    RETURNING *;
  `;

  return inserted as NotificationItem;
}

// Keep each category's productCount/totalStock in sync with the actual
// product list whenever products change.
async function recalcCategoryCounts() {
  const products = (await sql`SELECT category, stock FROM products`) as { category: string; stock: number }[];
  const categories = (await sql`SELECT * FROM categories`) as Category[];
  await Promise.all(
    categories.map((c) => {
      const matching = products.filter((p) => p.category === c.name);
      const totalStock = matching.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
      if (matching.length !== c.productCount || totalStock !== c.totalStock) {
        return sql`UPDATE categories SET "productCount" = ${matching.length}, "totalStock" = ${totalStock} WHERE id = ${c.id}`;
      }
      return Promise.resolve();
    })
  );
}

// ---------- Products ----------
export async function listProducts(): Promise<Product[]> {
  await ready();
  return (await sql`SELECT * FROM products ORDER BY "lastUpdated" DESC NULLS LAST`) as Product[];
}
export async function createProduct(p: Product): Promise<Product> {
  await ready();
  await sql`INSERT INTO products (id, name, sku, barcode, category, brand, batch, supplier, warehouse, shelf, stock, "minStock", "maxStock", unit, "mfgDate", "expiryDate", "lastRestocked", "lastUpdated", "healthScore", status, image, description, "packageSize", weight, manufacturer, "modelNumber", "qrCode", source)
             VALUES (${p.id}, ${p.name}, ${p.sku}, ${p.barcode}, ${p.category}, ${p.brand}, ${p.batch}, ${p.supplier}, ${p.warehouse}, ${p.shelf}, ${p.stock}, ${p.minStock}, ${p.maxStock}, ${p.unit}, ${p.mfgDate}, ${p.expiryDate}, ${p.lastRestocked}, ${p.lastUpdated}, ${p.healthScore}, ${p.status}, ${p.image || ""}, ${p.description || null}, ${p.packageSize || null}, ${p.weight || null}, ${p.manufacturer || null}, ${p.modelNumber || null}, ${p.qrCode || null}, ${p.source || null})`;
  await recalcCategoryCounts();
  return p;
}
export async function updateProduct(id: string, p: Product): Promise<Product> {
  await ready();
  const updated = { ...p, id };
  await sql`INSERT INTO products (id, name, sku, barcode, category, brand, batch, supplier, warehouse, shelf, stock, "minStock", "maxStock", unit, "mfgDate", "expiryDate", "lastRestocked", "lastUpdated", "healthScore", status, image, description, "packageSize", weight, manufacturer, "modelNumber", "qrCode", source)
             VALUES (${updated.id}, ${updated.name}, ${updated.sku}, ${updated.barcode}, ${updated.category}, ${updated.brand}, ${updated.batch}, ${updated.supplier}, ${updated.warehouse}, ${updated.shelf}, ${updated.stock}, ${updated.minStock}, ${updated.maxStock}, ${updated.unit}, ${updated.mfgDate}, ${updated.expiryDate}, ${updated.lastRestocked}, ${updated.lastUpdated}, ${updated.healthScore}, ${updated.status}, ${updated.image || ""}, ${updated.description || null}, ${updated.packageSize || null}, ${updated.weight || null}, ${updated.manufacturer || null}, ${updated.modelNumber || null}, ${updated.qrCode || null}, ${updated.source || null})
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, sku = EXCLUDED.sku, barcode = EXCLUDED.barcode, category = EXCLUDED.category,
               brand = EXCLUDED.brand, batch = EXCLUDED.batch, supplier = EXCLUDED.supplier, warehouse = EXCLUDED.warehouse,
               shelf = EXCLUDED.shelf, stock = EXCLUDED.stock, "minStock" = EXCLUDED."minStock", "maxStock" = EXCLUDED."maxStock",
               unit = EXCLUDED.unit, "mfgDate" = EXCLUDED."mfgDate", "expiryDate" = EXCLUDED."expiryDate",
               "lastRestocked" = EXCLUDED."lastRestocked", "lastUpdated" = EXCLUDED."lastUpdated", "healthScore" = EXCLUDED."healthScore",
               status = EXCLUDED.status, image = EXCLUDED.image, description = EXCLUDED.description,
               "packageSize" = EXCLUDED."packageSize", weight = EXCLUDED.weight, manufacturer = EXCLUDED.manufacturer,
               "modelNumber" = EXCLUDED."modelNumber", "qrCode" = EXCLUDED."qrCode", source = EXCLUDED.source`;
  await updateBatch(updated.id, {
    batchNumber: updated.batch,
    mfgDate: updated.mfgDate,
    expiryDate: updated.expiryDate,
    quantity: updated.stock,
    warehouse: updated.warehouse,
  });
  await recalcCategoryCounts();
  return updated;
}
export async function deleteProduct(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM products WHERE id = ${id}`;
  await recalcCategoryCounts();
}

/**
 * The single source of truth for "have we seen this barcode before".
 * Normalizes whitespace so scans of the same physical barcode always match
 * regardless of how a symbology decoder padded/trimmed the digits.
 */
export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  await ready();
  const normalized = barcode.trim();
  const rows = (await sql`SELECT * FROM products WHERE TRIM(barcode) = ${normalized} LIMIT 1`) as Product[];
  return rows[0] ?? null;
}

/**
 * The single enforcement point for "never duplicate a barcode": if a
 * product with this barcode already exists, update it in place — filling
 * in any field that's currently blank on the existing row from the
 * incoming data, but never clobbering a value that's already set (e.g. a
 * real warehouse/stock/expiry someone already entered) with a blank one.
 * If no product with this barcode exists yet, insert it fresh.
 *
 * Used by both the barcode-lookup auto-save path (lib/productLookup.ts)
 * and the manual/scan-workflow "Save Product" step (POST /api/products),
 * so the no-duplicates rule is enforced in exactly one place regardless of
 * which caller triggers the save.
 */
export async function upsertProductByBarcode(input: Product): Promise<Product> {
  await ready();
  const existing = await findProductByBarcode(input.barcode);
  if (!existing) {
    return createProduct(input);
  }

  const fill = <K extends keyof Product>(key: K): Product[K] => {
    const current = existing[key];
    const isBlank = current === "" || current === null || current === undefined || current === 0;
    return isBlank && input[key] ? input[key] : current;
  };

  const merged: Product = {
    ...existing,
    name: fill("name"),
    sku: fill("sku"),
    category: existing.category && existing.category !== "Uncategorized" ? existing.category : input.category || existing.category,
    brand: fill("brand"),
    batch: fill("batch"),
    supplier: fill("supplier"),
    warehouse: fill("warehouse"),
    shelf: fill("shelf"),
    stock: fill("stock"),
    minStock: fill("minStock"),
    maxStock: fill("maxStock"),
    unit: fill("unit"),
    mfgDate: fill("mfgDate"),
    expiryDate: fill("expiryDate"),
    lastRestocked: fill("lastRestocked"),
    lastUpdated: new Date().toISOString().slice(0, 10),
    healthScore: input.healthScore || existing.healthScore,
    status: input.status || existing.status,
    image: fill("image"),
    description: fill("description"),
    packageSize: fill("packageSize"),
    weight: fill("weight"),
    manufacturer: fill("manufacturer"),
    modelNumber: fill("modelNumber"),
    qrCode: fill("qrCode"),
    source: existing.source || input.source,
  };
  return updateProduct(existing.id, merged);
}

export async function listBatches(productId?: string): Promise<ProductBatch[]> {
  await ready();
  if (productId) {
    return (await sql`SELECT * FROM product_batches WHERE "productId" = ${productId} ORDER BY "scannedAt" DESC NULLS LAST`) as ProductBatch[];
  }
  return (await sql`SELECT * FROM product_batches ORDER BY "scannedAt" DESC NULLS LAST`) as ProductBatch[];
}
export async function createBatch(b: ProductBatch): Promise<ProductBatch> {
  await ready();
  await sql`INSERT INTO product_batches (id, "productId", barcode, "batchNumber", "lotNumber", quantity, "mfgDate", "expiryDate", mrp, "netWeight", warehouse, "scannedBy", "scannedAt", "ocrConfidence")
             VALUES (${b.id}, ${b.productId}, ${b.barcode}, ${b.batchNumber}, ${b.lotNumber}, ${b.quantity}, ${b.mfgDate}, ${b.expiryDate}, ${b.mrp}, ${b.netWeight}, ${b.warehouse}, ${b.scannedBy}, ${b.scannedAt}, ${b.ocrConfidence ? JSON.stringify(b.ocrConfidence) : null})`;
  return b;
}
export async function updateBatch(productId: string, batch: Partial<ProductBatch>): Promise<void> {
  await ready();

  const result = await sql`
    UPDATE product_batches
    SET
      "batchNumber" = ${batch.batchNumber ?? ""},
      "mfgDate" = ${batch.mfgDate ?? ""},
      "expiryDate" = ${batch.expiryDate ?? ""},
      quantity = ${batch.quantity ?? 0},
      warehouse = ${batch.warehouse ?? ""}
    WHERE "productId" = ${productId}
    RETURNING id;
  `;

  
}

// ---------- Categories ----------
export async function listCategories(): Promise<Category[]> {
  await ready();
  return (await sql`SELECT * FROM categories ORDER BY name`) as Category[];
}
export async function createCategory(c: Category): Promise<Category> {
  await ready();
  await sql`INSERT INTO categories (id, name, "productCount", "totalStock", color) VALUES (${c.id}, ${c.name}, ${c.productCount}, ${c.totalStock}, ${c.color})`;
  return c;
}
export async function deleteCategory(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM categories WHERE id = ${id}`;
}

// ---------- Suppliers ----------
export async function listSuppliers(): Promise<Supplier[]> {
  await ready();
  return (await sql`SELECT * FROM suppliers ORDER BY name`) as Supplier[];
}
export async function createSupplier(s: Supplier): Promise<Supplier> {
  await ready();
  await sql`INSERT INTO suppliers (id, name, contact, email, "productsSupplied", reliability, "lastOrder", status)
             VALUES (${s.id}, ${s.name}, ${s.contact}, ${s.email}, ${s.productsSupplied}, ${s.reliability}, ${s.lastOrder}, ${s.status})`;
  return s;
}
export async function deleteSupplier(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM suppliers WHERE id = ${id}`;
}

// ---------- Users ----------
export async function listUsers(): Promise<AppUser[]> {
  await ready();
  return (await sql`SELECT * FROM app_users ORDER BY name`) as AppUser[];
}
export async function createUser(u: AppUser): Promise<AppUser> {
  await ready();
  await sql`INSERT INTO app_users (id, name, email, role, warehouse, status, "lastActive")
             VALUES (${u.id}, ${u.name}, ${u.email}, ${u.role}, ${u.warehouse}, ${u.status}, ${u.lastActive})`;
  return u;
}
export async function deleteUser(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM app_users WHERE id = ${id}`;
}

// ---------- Purchase requests (Procurement) ----------
export async function listPurchaseRequests(): Promise<PurchaseRequest[]> {
  await ready();
  const rows = (await sql`SELECT * FROM purchase_requests ORDER BY date DESC`) as any[];
  return rows.map((r) => ({ ...r, estCost: Number(r.estCost) })) as PurchaseRequest[];
}
export async function updatePurchaseRequest(id: string, r: PurchaseRequest): Promise<PurchaseRequest> {
  await ready();
  const updated = { ...r, id };
  await sql`INSERT INTO purchase_requests (id, product, quantity, "requestedBy", warehouse, status, date, "estCost")
             VALUES (${updated.id}, ${updated.product}, ${updated.quantity}, ${updated.requestedBy}, ${updated.warehouse}, ${updated.status}, ${updated.date}, ${updated.estCost})
             ON CONFLICT (id) DO UPDATE SET
               product = EXCLUDED.product, quantity = EXCLUDED.quantity, "requestedBy" = EXCLUDED."requestedBy",
               warehouse = EXCLUDED.warehouse, status = EXCLUDED.status, date = EXCLUDED.date, "estCost" = EXCLUDED."estCost"`;
  return updated;
}

// ---------- Notifications ----------
export async function listNotifications(): Promise<NotificationItem[]> {
  await ready();
  return (await sql`
  SELECT *
  FROM notifications
  ORDER BY CAST(SUBSTRING(id FROM 3 FOR 13) AS BIGINT) DESC;
`) as NotificationItem[];
}
export async function updateNotification(id: string, n: NotificationItem): Promise<NotificationItem> {
  await ready();
  const updated = { ...n, id };
  await sql`INSERT INTO notifications (id, category, message, time, read)
             VALUES (${updated.id}, ${updated.category}, ${updated.message}, ${updated.time}, ${updated.read})
             ON CONFLICT (id) DO UPDATE SET category = EXCLUDED.category, message = EXCLUDED.message, time = EXCLUDED.time, read = EXCLUDED.read`;
  return updated;
}
export async function markAllNotificationsRead(): Promise<NotificationItem[]> {
  await ready();
  await sql`UPDATE notifications SET read = true WHERE read = false`;
  return listNotifications();
}

// ---------- Settings ----------
export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  await ready();
  const rows = (await sql`SELECT * FROM notification_prefs WHERE id = 1`) as any[];
  const row = rows[0];
  return row
    ? { lowStock: row.lowStock, expiry: row.expiry, transfers: row.transfers, aiDigest: row.aiDigest }
    : { lowStock: true, expiry: true, transfers: true, aiDigest: false };
}
export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<NotificationPrefs> {
  await ready();
  await sql`INSERT INTO notification_prefs (id, "lowStock", expiry, transfers, "aiDigest")
             VALUES (1, ${prefs.lowStock}, ${prefs.expiry}, ${prefs.transfers}, ${prefs.aiDigest})
             ON CONFLICT (id) DO UPDATE SET "lowStock" = EXCLUDED."lowStock", expiry = EXCLUDED.expiry, transfers = EXCLUDED.transfers, "aiDigest" = EXCLUDED."aiDigest"`;
  return prefs;
}

// ---------- Staff ----------
export async function listStaff(): Promise<StaffMember[]> {
  await ready();
  return (await sql`SELECT * FROM staff ORDER BY name`) as StaffMember[];
}
export async function createStaffMember(s: StaffMember): Promise<StaffMember> {
  await ready();
  await sql`INSERT INTO staff (id, name, role, department, phone, email, "shiftStart", "shiftEnd", status, "joinDate", "avatarColor")
             VALUES (${s.id}, ${s.name}, ${s.role}, ${s.department}, ${s.phone}, ${s.email}, ${s.shiftStart}, ${s.shiftEnd}, ${s.status}, ${s.joinDate}, ${s.avatarColor})`;
  return s;
}
export async function deleteStaffMember(id: string): Promise<void> {
  await ready();
  await sql`DELETE FROM staff WHERE id = ${id}`;
}

// ---------- Attendance ----------
export async function listAttendance(date?: string): Promise<AttendanceRecord[]> {
  await ready();
  if (date) {
    return (await sql`SELECT * FROM attendance WHERE date = ${date} ORDER BY id`) as AttendanceRecord[];
  }
  return (await sql`SELECT * FROM attendance ORDER BY date DESC, id`) as AttendanceRecord[];
}
export async function upsertAttendance(staffId: string, date: string, patch: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
  await ready();
  const existingRows = (await sql`SELECT * FROM attendance WHERE "staffId" = ${staffId} AND date = ${date} LIMIT 1`) as AttendanceRecord[];
  const existing = existingRows[0];

  const merged: AttendanceRecord = existing
    ? { ...existing, ...patch }
    : {
        id: `att-${Date.now()}`,
        staffId,
        date,
        checkIn: null,
        checkOut: null,
        status: "absent",
        ...patch,
      };

  await sql`INSERT INTO attendance (id, "staffId", date, "checkIn", "checkOut", status, notes)
             VALUES (${merged.id}, ${merged.staffId}, ${merged.date}, ${merged.checkIn}, ${merged.checkOut}, ${merged.status}, ${merged.notes || null})
             ON CONFLICT (id) DO UPDATE SET "checkIn" = EXCLUDED."checkIn", "checkOut" = EXCLUDED."checkOut", status = EXCLUDED.status, notes = EXCLUDED.notes`;
  return merged;
}
