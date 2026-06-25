
// --- 1. STORE & USER ---

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  OWNER = 'OWNER',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

// --- 2. PRODUCT & INVENTORY ---

export interface Product {
  id: string;
  storeId: string;
  category: string;
  name: string;
  barcode: string;
  imageUrl: string | null;
  parentProductId: string | null;
  variantName: string | null;

  // Pricing
  price: number;
  minPrice: number;

  // Aggregate Inventory
  totalQuantity: number;
  minQuantity: number;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  storeId: string;

  // Batch Tracking
  quantityReceived: number;
  quantityRemaining: number;

  // Dates
  dateArrived: Date;
  manufacturedDate: Date | null;
  expiryDate: Date | null;

  // Financials
  wholesalePrice: number;

  isActive: boolean;
}

// --- 3. ORDERS & TRANSACTIONS ---

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

export enum DiscountReason {
  COUPON = 'COUPON',
  LOYALTY = 'LOYALTY',
  CLEARANCE = 'CLEARANCE',
  MANAGER_OVERRIDE = 'MANAGER_OVERRIDE'
}

export interface Order {
  id: string;
  storeId: string;
  cashierId: string;
  customerId: string | null;

  type: InvoiceType;
  refundOriginalOrderId: string | null;

  // Totals
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;

  // Sales Analytics
  itemCount: number;
  totalUnits: number;
  paymentMethod: PaymentMethod;
  discountReason: DiscountReason | null;

  // Telemetry
  isOfflineTransaction: boolean;
  offlineSyncDelaySeconds: number | null;
  checkoutDurationSeconds: number;

  createdAt: Date;
}

// --- 4. LINE ITEMS ---

export enum ScanMethod {
  BARCODE_SCAN = 'BARCODE_SCAN',
  MANUAL_ENTRY = 'MANUAL_ENTRY',
  AI_CAMERA = 'AI_CAMERA',
  QUICK_BUTTON = 'QUICK_BUTTON'
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;

  // Snapshots
  nameSnapshot: string;
  categorySnapshot: string;
  barcodeSnapshot: string;

  // Financial Snapshots
  originalPrice: number;
  price: number;
  priceOverridden: boolean;
  wholesalePrice: number;
  discountPerItem: number;
  quantity: number;
  total: number;

  // Tracking
  refundedQuantity: number;

  // AI Telemetry
  scanMethod: ScanMethod;
  aiConfidenceScore: number | null;
}

// --- 5. ALERTS & NOTIFICATIONS ---

export enum AlertPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
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

// --- 6. INVENTORY LOGS ---

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

  changeAmount: number;
  reason: InventoryChangeReason;
  notes: string | null;

  createdAt: Date;
}

// --- 7. OLAP TELEMETRY ---

export interface AbandonedCart {
  id: string;
  storeId: string;
  cashierId: string;
  items: any;
  itemCount: number;
  totalValue: number;
  reason: string | null;
  createdAt: Date;
}

export interface SearchFailure {
  id: string;
  storeId: string;
  cashierId: string;
  searchQuery: string;
  searchType: string;
  createdAt: Date;
}
