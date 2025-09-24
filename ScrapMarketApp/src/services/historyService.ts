import { n8nMcpService } from './n8nMcpService';

// History interfaces
export interface PriceHistoryEntry {
  date: string;
  price: number;
  supermarket: string;
  stock: boolean;
  url?: string;
}

export interface ProductHistory {
  canonid: string;
  canonname: string;
  brand?: string; // ← Nueva propiedad para la marca
  history: PriceHistoryEntry[];
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  lastUpdated: string;
}

export interface HistoryResponse {
  status: string;
  data: ProductHistory;
  message: string;
}

// History Service Class
class HistoryService {
  async getProductHistory(canonid: string): Promise<HistoryResponse> {
    try {
      const data = await n8nMcpService.getPriceHistory(canonid);
      
      // Transform the response to match our interface
      const productHistory: ProductHistory = {
        canonid: data.canonid || canonid,
        canonname: data.canonname || '',
        history: data.history || [],
        averagePrice: this.calculateAveragePrice(data.history || []),
        priceRange: this.calculatePriceRange(data.history || []),
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
      
      return {
        status: 'success',
        data: productHistory,
        message: 'Product history retrieved successfully',
      };
    } catch (error) {
      console.error('Get product history error:', error);
      throw new Error('Failed to get product history');
    }
  }

  private calculateAveragePrice(history: PriceHistoryEntry[]): number {
    if (history.length === 0) return 0;
    
    const totalPrice = history.reduce((sum, entry) => sum + entry.price, 0);
    return Math.round((totalPrice / history.length) * 100) / 100;
  }

  private calculatePriceRange(history: PriceHistoryEntry[]): { min: number; max: number } {
    if (history.length === 0) return { min: 0, max: 0 };
    
    const prices = history.map(entry => entry.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  async getPriceTrend(canonid: string, days: number = 30): Promise<PriceHistoryEntry[]> {
    try {
      const response = await this.getProductHistory(canonid);
      const history = response.data.history;
      
      // Filter history by date range
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return history.filter(entry => new Date(entry.date) >= cutoffDate);
    } catch (error) {
      console.error('Get price trend error:', error);
      throw new Error('Failed to get price trend');
    }
  }

  async getLowestPrice(canonid: string): Promise<PriceHistoryEntry | null> {
    try {
      const response = await this.getProductHistory(canonid);
      const history = response.data.history;
      
      if (history.length === 0) return null;
      
      return history.reduce((lowest, current) => 
        current.price < lowest.price ? current : lowest
      );
    } catch (error) {
      console.error('Get lowest price error:', error);
      throw new Error('Failed to get lowest price');
    }
  }
}

export const historyService = new HistoryService();


