import { getEnvironmentConfig } from '../config/environment';

export interface SupermarketPrice {
  super: string;
  precio: number;
  stock: boolean;
  url: string;
  capture: string;
}

export interface SearchResult {
  canonid: string;
  canonname: string;
  min_price: number;
  max_price: number;
  total_supermarkets: number;
  last_updated: string;
  supermarkets: SupermarketPrice[];
}

export interface SearchResponse {
  status: string;
  data: SearchResult[];
  total: number;
  searchTime: string;
}

class SearchService {
  private baseUrl: string;

  constructor() {
    const config = getEnvironmentConfig();
    this.baseUrl = config.API_BASE_URL;
  }

  async searchProducts(query: string): Promise<SearchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/products?canonname=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the response to match our interface
      return {
        status: 'success',
        data: data || [],
        total: data?.length || 0,
        searchTime: '45ms', // This would come from the API in a real implementation
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Failed to search products');
    }
  }

  async getProductDetails(canonid: string): Promise<SearchResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/products?canonid=${encodeURIComponent(canonid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data?.[0] || null;
    } catch (error) {
      console.error('Get product details error:', error);
      throw new Error('Failed to get product details');
    }
  }
}

export const searchService = new SearchService();
