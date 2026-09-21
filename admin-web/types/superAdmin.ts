// types/superAdmin.ts
// Strict TypeScript types for DailyTally Super Admin API responses and entities

export interface SuperAdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  superAdmin: SuperAdminUser;
}

export interface ShopCounts {
  customers: {
    total: number;
    active: number;
    deleted: number;
  };
  wholesalers: {
    total: number;
    active: number;
    deleted: number;
  };
  items: number;
  staff: number;
}

export interface Shop {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  counts: ShopCounts;
}

export interface ShopSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface DeletedByRef {
  id?: string;
  _id?: string;
  name: string;
  email: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  userId: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | string | null;
  totalUdhaar?: number;
  totalWasool?: number;
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDetail {
  id: string;
  name: string;
  phone?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | null;
  createdAt?: string;
}

export interface CustomerTotals {
  totalUdhaar: number;
  totalWasool: number;
  balance: number;
  activeEntriesCount: number;
  deletedEntriesCount: number;
  totalEntriesCount: number;
}

export interface CustomerEntry {
  _id: string;
  customerId: string;
  type: 'item' | 'payment';
  itemName?: string;
  quantity?: number;
  rate?: number;
  amount: number;
  note?: string;
  entryDate: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerDetailResponse {
  customer: CustomerDetail;
  shop: ShopSummary;
  totals: CustomerTotals;
  entries: CustomerEntry[];
}

export interface ShopCustomersResponse {
  shop: ShopSummary;
  customers: Customer[];
}

export interface Wholesaler {
  _id: string;
  name: string;
  phone?: string;
  userId: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | string | null;
  totalKharedari?: number;
  totalPayment?: number;
  totalAdvance?: number;
  totalAdvanceSettlement?: number;
  baqiBaqaya?: number;
  advanceBaqi?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WholesalerDetail {
  id: string;
  name: string;
  phone?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | null;
  createdAt?: string;
}

export interface WholesalerTotals {
  totalKharedari: number;
  totalPayment: number;
  totalAdvance: number;
  totalAdvanceSettlement: number;
  baqiBaqaya: number;
  advanceBaqi: number;
  activeEntriesCount: number;
  deletedEntriesCount: number;
  totalEntriesCount: number;
}

export interface WholesalerEntryExtraItem {
  itemId?: string;
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface WholesalerEntryShortageItem {
  itemId?: string;
  itemName: string;
  quantity: number;
  rate: number;
  totalDeduction: number;
}

export interface WholesalerEntry {
  _id: string;
  wholesalerId: string;
  type: 'purchase' | 'payment' | 'advance' | 'advanceSettlement';
  amount: number;
  note?: string;
  entryDate: string;
  billNumber?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  extraItems?: WholesalerEntryExtraItem[];
  shortageItems?: WholesalerEntryShortageItem[];
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: DeletedByRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WholesalerDetailResponse {
  wholesaler: WholesalerDetail;
  shop: ShopSummary;
  totals: WholesalerTotals;
  entries: WholesalerEntry[];
}

export interface ShopWholesalersResponse {
  shop: ShopSummary;
  wholesalers: Wholesaler[];
}

export interface AuditLogUserRef {
  _id: string;
  name: string;
  email: string;
}

export interface AuditLogShopRef {
  _id: string;
  name: string;
  email: string;
}

export interface AuditLogEntry {
  _id: string;
  shopId?: AuditLogShopRef | string | null;
  performedByUserId?: AuditLogUserRef | string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | string;
  entityType: 'Customer' | 'Entry' | 'Wholesaler' | 'WholesalerEntry' | 'Item' | string;
  entityId: string;
  entitySnapshot: Record<string, unknown> | null;
  timestamp: string;
}

export interface AuditLogResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  logs: AuditLogEntry[];
}

export interface AuditLogFilters {
  shopId?: string;
  userId?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
