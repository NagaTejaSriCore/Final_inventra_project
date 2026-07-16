export type ProductStatus = "healthy" | "low" | "out" | "expiring" | "expired";

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  batch: string;
  supplier: string;
  warehouse: string;
  shelf: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  mfgDate: string;
  expiryDate: string;
  lastRestocked: string;
  lastUpdated: string;
  healthScore: number;
  status: ProductStatus;
  image: string;
  // Catalog fields captured once, at first scan, and reused on every future scan.
  description?: string;
  packageSize?: string;
  weight?: string;
  manufacturer?: string;
  modelNumber?: string;
  qrCode?: string;
  /** Where the catalog data originally came from (audit trail). */
  source?: "manual" | "database" | "openfoodfacts" | "upcitemdb" | "barcodelookup" | "eansearch";
}

/**
 * A single received batch/lot of a product. Product master data (name, brand,
 * image, category...) is stored once on the Product. Everything that varies
 * per delivery — quantity, dates, lot/batch numbers, warehouse — lives here.
 */
export interface ProductBatch {
  id: string;
  productId: string;
  barcode: string;
  batchNumber: string;
  lotNumber: string;
  quantity: number;
  mfgDate: string;
  expiryDate: string;
  mrp: string;
  netWeight: string;
  warehouse: string;
  scannedBy: string;
  scannedAt: string;
  ocrConfidence?: Partial<Record<"expiryDate" | "mfgDate" | "batchNumber" | "lotNumber" | "mrp" | "netWeight" | "quantity", number>>;
}

export interface Category {
  id: string;
  name: string;
  productCount: number;
  totalStock: number;
  color: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  used: number;
  products: number;
  manager: string;
  transfersPending: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  productsSupplied: number;
  reliability: number;
  lastOrder: string;
  status: "active" | "pending" | "inactive";
}

export type UserRole = "Administrator" | "Inventory Manager" | "Warehouse Staff";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
}

export interface AIInsight {
  id: string;
  type: "restock" | "transfer" | "expiry" | "slow-moving" | "excess";
  title: string;
  detail: string;
  urgency: "low" | "medium" | "high";
  product?: string;
}

export interface NotificationItem {
  id: string;
  category:
  | "Low Stock"
  | "Out of Stock"
  | "Expiry"
  | "Warehouse"
  | "Shipment"
  | "Purchase Request"
  | "Transfer"
  | "AI Recommendation"
  | "Task"
  | "Leave Request";
  message: string;
  time: string;
  read: boolean;
}

export interface PurchaseRequest {
  id: string;
  product: string;
  quantity: number;
  requestedBy: string;
  warehouse: string;
  status: "pending" | "approved" | "rejected";
  date: string;
  estCost: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  shiftStart: string;
  shiftEnd: string;
  status: "active" | "on-leave" | "inactive";
  joinDate: string;
  avatarColor: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "half-day" | "on-leave";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  notes?: string;
}
