import { getApiConfig, isFeatureEnabled } from '../config/environment';

// Normalize the base URL so that we always point to the n8n host (no workflow path)
const normalizeBaseUrl = (rawBaseUrl: string): string => {
  if (!rawBaseUrl) {
    return '';
  }

  // Legacy fallback: if manifest still sirve la IP vieja, forzar migración
  const legacyHost = '192.168.0.158';
  const currentHost = '192.168.1.99';
  if (rawBaseUrl.includes(legacyHost)) {
    rawBaseUrl = rawBaseUrl.replace(legacyHost, currentHost);
  }

  try {
    const parsedUrl = new URL(rawBaseUrl);
    let basePath = parsedUrl.pathname || '';

    // If the path already contains /webhook/... remove everything from there on
    const webhookIndex = basePath.indexOf('/webhook');
    if (webhookIndex !== -1) {
      basePath = basePath.slice(0, webhookIndex);
    }

    // Trim trailing slash (keeping root path empty)
    if (basePath === '/') {
      basePath = '';
    } else if (basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1);
    }

    const normalized = `${parsedUrl.origin}${basePath}`;
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
  } catch (error) {
    console.warn('Warning: invalid API base URL format. Falling back to basic cleanup.', error);
    return rawBaseUrl.replace(/\/webhook\/?.*$/, '').replace(/\/$/, '');
  }
};

// n8n MCP Configuration Interface
export interface N8nMcpConfig {
  baseUrl: string;
  webhook: string;
  mcp: string;
  timeout: number;
  retries: number;
  cors: boolean;
  logging: boolean;
}

// n8n Workflow Endpoints
export interface N8nWorkflow {
  products: {
    endpoint: string;
    method: string;
    queryParam: string;
  };
  prices: {
    endpoint: string;
    method: string;
    queryParam: string;
  };
  alerts: {
    endpoint: string;
    method: string;
  };
  history: {
    endpoint: string;
    pathParam: string;
    method: string;
  };
}

// n8n MCP Service Class
class N8nMcpService {
  private config: N8nMcpConfig;
  private workflows: N8nWorkflow;

  constructor() {
    const apiConfig = getApiConfig();
    const debugLogging = isFeatureEnabled('DEBUG_LOGGING');
    const baseUrl = normalizeBaseUrl(apiConfig.baseUrl);

    this.config = {
      baseUrl,
      webhook: '/webhook',
      mcp: '/mcp',
      timeout: apiConfig.timeout,
      retries: apiConfig.retries,
      cors: true,
      logging: debugLogging,
    };

    if (debugLogging) {
      console.log('[n8nMcpService] Base URL (raw):', apiConfig.baseUrl);
      console.log('[n8nMcpService] Base URL (normalized):', baseUrl);
    }

    this.workflows = {
      products: {
        endpoint: '/webhook/search-products-complete',
        method: 'GET',
        queryParam: 'q',
      },
      prices: {
        endpoint: '/webhook/products-per-market',
        method: 'GET',
        queryParam: 'canonname',
      },
      alerts: {
        endpoint: '/webhook/user-alert',
        method: 'POST',
      },
      history: {
        endpoint: '/webhook/historial',
        pathParam: 'canonid',
        method: 'GET',
      },
    };
  }

  // Generic request method with retry logic and data saver mode support
  private async makeRequest(
    url: string,
    options: RequestInit = {},
    retryCount: number = 0,
    dataSaverMode: boolean = false
  ): Promise<Response> {
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      mode: this.config.cors ? 'cors' : 'no-cors',
    };

    if (this.config.logging) {
      console.log(`🔄 n8n MCP Request: ${url}`, requestOptions);
    }

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`⏰ n8n MCP Request timeout after ${this.config.timeout}ms`);
        controller.abort();
      }, this.config.timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (this.config.logging) {
        console.log(`✅ n8n MCP Response: ${response.status}`, response);
      }
      
      return response;
    } catch (error) {
      // No reintentar si es un error de aborto (timeout)
      if ((error as any).name === 'AbortError') {
        console.error('❌ n8n MCP Request aborted (timeout)');
        throw new Error(`Request timeout after ${this.config.timeout}ms. The scraping process may be taking longer than expected.`);
      }
      
      if (retryCount < this.config.retries) {
        console.warn(`⚠️ n8n MCP Request failed, retrying... (${retryCount + 1}/${this.config.retries})`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Aumentar delay entre reintentos
        return this.makeRequest(url, options, retryCount + 1);
      }
      
      console.error('❌ n8n MCP Request failed after retries:', error);
      throw error;
    }
  }

  // Search products using n8n workflow (main endpoint with scraping logic)
  async searchProducts(query: string, dataSaverMode: boolean = false): Promise<any> {
    // Add data saver mode parameter to URL
    const dataSaverParam = dataSaverMode ? '&dataSaverMode=true' : '';
    const url = `${this.config.baseUrl}${this.workflows.products.endpoint}?${this.workflows.products.queryParam}=${encodeURIComponent(query)}${dataSaverParam}`;
    
    const response = await this.makeRequest(url, {
      method: this.workflows.products.method,
    }, 0, dataSaverMode);

    if (!response.ok) {
      throw new Error(`n8n Products API error: ${response.status}`);
    }

        // Check if response has content
        const text = await response.text();
        console.log('🔍 Raw response text length:', text.length);
        console.log('🔍 Raw response text preview:', text.substring(0, 200));
        console.log('🔍 Full response text:', text);

        if (!text || text.trim() === '') {
          console.warn('⚠️ n8n returned empty response');
          return [];
        }

    try {
      const parsed = JSON.parse(text);
      console.log('✅ JSON parsed successfully:', parsed);
      console.log('🔍 Parsed response type:', typeof parsed);
      console.log('🔍 Parsed response keys:', Object.keys(parsed));
      return parsed;
    } catch (error) {
      console.error('❌ JSON Parse error:', error);
      console.error('❌ Response text:', text);
      throw new Error(`Invalid JSON response from n8n: ${text.substring(0, 100)}...`);
    }
  }

  // Search products in database only (no scraping)
  async searchProductsInDatabaseOnly(query: string): Promise<any> {
    const url = `${this.config.baseUrl}/webhook/search-in-db?q=${encodeURIComponent(query)}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`n8n Database Search API error: ${response.status}`);
    }

    // Check if response has content
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.warn('⚠️ n8n database search returned empty response');
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      console.log('✅ Database search JSON parsed successfully:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ Database search JSON Parse error:', error);
      console.error('❌ Response text:', text);
      throw new Error(`Invalid JSON response from n8n database search: ${text.substring(0, 100)}...`);
    }
  }

  // Search popular products (for when clicking on popular product carousel)
  async searchPopularProducts(query: string): Promise<any> {
    const url = `${this.config.baseUrl}/webhook/search-popular-products?q=${encodeURIComponent(query)}`;
    
    const response = await this.makeRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`n8n Popular Products Search API error: ${response.status}`);
    }

    // Check if response has content
    const text = await response.text();
    if (!text || text.trim() === '') {
      console.warn('⚠️ n8n popular products search returned empty response');
      return [];
    }

    try {
      const parsed = JSON.parse(text);
      console.log('✅ Popular products search JSON parsed successfully:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ Popular products search JSON Parse error:', error);
      console.error('❌ Response text:', text);
      throw new Error(`Invalid JSON response from n8n popular products search: ${text.substring(0, 100)}...`);
    }
  }

  // Get prices per market using n8n workflow
  async getPricesPerMarket(canonname: string): Promise<any> {
    const url = `${this.config.baseUrl}${this.workflows.prices.endpoint}?${this.workflows.prices.queryParam}=${encodeURIComponent(canonname)}`;
    
    const response = await this.makeRequest(url, {
      method: this.workflows.prices.method,
    });

    if (!response.ok) {
      throw new Error(`n8n Prices API error: ${response.status}`);
    }

    return response.json();
  }

  // Create user alert using n8n workflow
  async createUserAlert(alertData: any): Promise<any> {
    const url = `${this.config.baseUrl}${this.workflows.alerts.endpoint}`;
    
    const response = await this.makeRequest(url, {
      method: this.workflows.alerts.method,
      body: JSON.stringify(alertData),
    });

    if (!response.ok) {
      throw new Error(`n8n Alerts API error: ${response.status}`);
    }

    return response.json();
  }

  // Get price history using n8n workflow
  async getPriceHistory(canonid: string): Promise<any> {
    const url = `${this.config.baseUrl}${this.workflows.history.endpoint}/${canonid}`;
    
    const response = await this.makeRequest(url, {
      method: this.workflows.history.method,
    });

    if (!response.ok) {
      throw new Error(`n8n History API error: ${response.status}`);
    }

    return response.json();
  }

  // Get MCP configuration
  getConfig(): N8nMcpConfig {
    return this.config;
  }

  // Get workflow endpoints
  getWorkflows(): N8nWorkflow {
    return this.workflows;
  }

  // Test n8n MCP connection
  async testConnection(): Promise<boolean> {
    try {
      // Test with just the base URL to verify n8n is working
      // Don't call any workflow endpoints to avoid triggering scraping
      const url = `${this.config.baseUrl}/`;
      const response = await this.makeRequest(url, { method: 'GET' });
      
      // Consider connection successful if we get any response
      return response.ok;
    } catch (error) {
      console.error('n8n MCP connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const n8nMcpService = new N8nMcpService();
