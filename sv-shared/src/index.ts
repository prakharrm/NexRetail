
// --- 1. PRODUCT & INVENTORY ---

export interface Product {
  id: string; // UUID
  storeId: string; // Tenant ID
  category: string;
  name: string;
  barcode: string;

  // Pricing
  price: number; // Default selling price
  minPrice: number; // Lowest allowed price 

  // Aggregate Inventory
  totalQuantity: number; // Sum of all active batches
  minQuantity: number; // Alert threshold

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryBatch {
  id: string; // UUID
  productId: string;
  storeId: string;

  // Batch Tracking
  quantityReceived: number; // Initial amount delivered
  quantityRemaining: number; // Current amount left in this specific batch

  // Dates
  dateArrived: Date;
  manufacturedDate: Date | null;
  expiryDate: Date | null;

  // Financials 
  wholesalePrice: number; // The exact cost the vendor paid for *this specific batch*

  isActive: boolean;
}

// --- 2. ORDERS & TRANSACTIONS ---

export enum InvoiceType {
  SALE = 'SALE',
  REFUND = 'REFUND'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  UPI = 'UPI',
  STORE_CREDIT = 'STORE_CREDIT'
}

export interface Order {
  id: string; // UUID
  storeId: string;
  cashierId: string;

  type: InvoiceType;
  refundOriginalOrderId: string | null; // If this is a refund, links to the original sale

  // Totals
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;

  paymentMethod: PaymentMethod;

  // Telemetry 
  isOfflineTransaction: boolean; // Was this processed without internet?
  offlineSyncDelaySeconds: number | null; // How long until it synced to the cloud?
  checkoutDurationSeconds: number; // Time from first scan to successful payment

  createdAt: Date;
}

// --- 3. LINE ITEMS  ---

export enum ScanMethod {
  BARCODE_SCAN = 'BARCODE_SCAN',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  AI_CAMERA = 'AI_CAMERA',
  QUICK_BUTTON = 'QUICK_BUTTON' // Tapped from a hot-menu
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;

  // Snapshots 
  nameSnapshot: string;
  categorySnapshot: string;

  // Financial Snapshots
  price: number; // Sell price applied at the time
  wholesalePrice: number; // Exact cost price of the batch used
  quantity: number;
  total: number;

  // Tracking
  refundedQuantity: number;

  // AI Telemetry
  scanMethod: ScanMethod;
  aiConfidenceScore: number | null; // e.g. 0.98 if recognized by object detection
}

// --- 4. ALERTS & NOTIFICATIONS ---

export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM', // e.g. Low Stock
  HIGH = 'HIGH' // e.g. Out of Stock or Expiring Today
}

export interface StockAlert {
  id: string;
  storeId: string;
  productId: string;

  title: string;
  message: string;
  priority: AlertPriority;
  isRead: boolean;

  createdAt: Date;
}

// --- 5. INVENTORY LOGS (Shrinkage & Audit) ---

export enum InventoryChangeReason {
  SALE = 'SALE',
  RESTOCK = 'RESTOCK',
  REFUND = 'REFUND',
  EXPIRED = 'EXPIRED',
  DAMAGED = 'DAMAGED',
  THEFT = 'THEFT',
  UNKNOWN = 'UNKNOWN'
}

export interface InventoryLog {
  id: string;
  storeId: string;
  productId: string;
  batchId: string | null;

  changeAmount: number; // e.g. -2 or +50
  reason: InventoryChangeReason;
  notes: string | null;

  createdAt: Date;
}
