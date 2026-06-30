
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

// ========================================
// PAYLOADS (API CONTRACTS)
// ========================================

// --- Auth Payloads ---
export interface RegisterStorePayload {
  ownerName: string;
  email: string;
  password: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateCashierPayload {
  storeId: string;
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: { id: string; name: string; email: string; role: string };
  store: { id: string; name: string };
}

// --- Catalog Payloads ---
export interface CreateProductPayload {
  storeId: string;
  category?: string;
  name: string;
  barcode?: string;
  imageUrl?: string;
  parentProductId?: string;
  variantName?: string;
  price: number;
  minPrice?: number;
  totalQuantity?: number;
  minQuantity?: number;
}

export interface BulkOnboardPayload {
  storeId: string;
  parentName: string;
  category?: string;
  variants: {
    variantName: string;
    barcode?: string;
    imageUrl?: string;
    price: number;
    minPrice?: number;
    totalQuantity?: number;
    minQuantity?: number;
  }[];
}

export interface AddInventoryPayload {
  storeId: string;
  productId: string;
  quantity: number;
  costPrice?: number;
  supplier?: string;
  expiresAt?: string;
  notes?: string;
}

// --- Transaction Payloads ---
export interface CheckoutItem {
  productId: string;
  name: string;
  category?: string;
  barcode?: string;
  originalPrice: number;
  price: number;
  priceOverridden?: boolean;
  wholesalePrice?: number;
  discountPerItem?: number;
  quantity: number;
  scanMethod?: 'BARCODE_SCAN' | 'IMAGE_SEARCH' | 'MANUAL';
  aiConfidenceScore?: number;
}

export interface CheckoutPayload {
  storeId: string;
  cashierId: string;
  customerId?: string;
  items: CheckoutItem[];
  paymentMethod: string;
  discountReason?: string;
  orderDiscount?: number;
  isOfflineTransaction?: boolean;
  checkoutDurationSeconds?: number;
}

export interface RefundPayload {
  orderId: string;
  storeId: string;
  cashierId: string;
  items: { productId: string; quantity: number }[];
  reason?: string;
}

export interface AdjustInventoryPayload {
  storeId: string;
  productId: string;
  changeAmount: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'THEFT' | 'CORRECTION' | 'OTHER';
  notes?: string;
}

