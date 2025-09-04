// Navigation types
export type RootStackParamList = {
  Home: undefined;
  ProductDetails: { product: Product };
  Alerts: undefined;
  Profile: undefined;
};

// Product and price types
export interface Product {
  product_id: number;
  canonid: string;
  canonname: string;
  prices?: Price[];
  meta?: {
    minPrice?: number;
    lastSeen?: string;
  };
}

export interface Price {
  supermarket_id: string;
  super_name: string;
  price: number;
  stock: boolean;
  product_url?: string;
}

// User alert types
export interface UserAlert {
  id?: number;
  device_id: string;
  product_id: number;
  alert_type: string;
  threshold_value: number;
  is_active: boolean;
  created_at?: string;
  last_triggered?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Search types
export interface SearchFilters {
  supermarket?: string;
  inStock?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Supermarket types
export type SupermarketId = 'carrefour' | 'disco' | 'vea' | 'jumbo';

export interface Supermarket {
  id: SupermarketId;
  name: string;
  color: string;
  logo?: string;
}
