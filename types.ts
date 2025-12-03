export interface Dish {
  id: string;
  name: string;
  price: number;
}

export interface SpiceLevel {
  id: string;
  label: string;
  color: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartId: number;
  dish: Dish;
  spice: string;
  addons: Record<string, number>;
  totalPrice: number;
}

// 歷史訂單紀錄 (用於銷量統計)
export interface OrderRecord {
  id: string;
  timestamp: string; // ISO String
  items: CartItem[];
  totalAmount: number;
}

// 進貨紀錄
export interface StockEntry {
  id: string;
  timestamp: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number; // 總花費
}

export type SubmitStatus = 'success' | 'error' | null;

export type TimeRange = '3days' | '7days' | '2weeks' | '1month' | '3months' | '6months' | '1year' | 'custom';
export type ChartType = 'bar' | 'line' | 'pie';

export interface FrequentStockItem {
  name: string;
  unit: string;
}

// Global declaration for Google API
declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}