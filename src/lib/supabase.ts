import { createClient } from '@supabase/supabase-js';
import { config } from '../config/environment';

// Create Supabase client
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: {
      // Authentication configuration
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Database types (based on your structure)
export interface Product {
  product_id: number;
  canonid: string;
  canonname: string;
  prices?: Price[];
}

export interface Price {
  supermarket_id: string;
  super_name: string;
  price: number;
  stock: boolean;
  product_url?: string;
}

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

// Supabase utility functions
export const supabaseUtils = {
  // Get products (using your n8n endpoint)
  async searchProducts(query: string): Promise<Product[]> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/products?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Normalize data according to your structure
      return Array.isArray(data) ? data.map((item: any) => ({
        product_id: item.canonid || Math.random(),
        canonid: item.canonid || '',
        canonname: item.canonname || 'Product',
        prices: item.precios || []
      })) : [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  },

  // Get prices per market
  async getPricesPerMarket(canonname: string): Promise<Product[]> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/products-per-market?canonname=${encodeURIComponent(canonname)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting prices per market:', error);
      return [];
    }
  },

  // Create user alert
  async createUserAlert(alert: Omit<UserAlert, 'id' | 'created_at' | 'last_triggered'>): Promise<boolean> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Error creating user alert:', error);
      return false;
    }
  },

  // Get price history
  async getPriceHistory(canonid: string): Promise<any[]> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/producto/${canonid}/historial`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }
};
