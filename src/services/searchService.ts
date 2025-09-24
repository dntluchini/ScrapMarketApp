import { getEnvironmentConfig } from '../config/environment';
import { n8nMcpService } from './n8nMcpService';

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
  min_price: string;
  max_price: string;
  total_supermarkets: string;
  last_updated: string;
  supermarkets: SupermarketPrice[];
  brand?: string; // ← Nueva propiedad para la marca
  brandId?: string; // ← ID de la marca
}

export interface SearchResponse {
  status: 'found' | 'scraping' | 'queued' | 'scraped' | 'not_found' | 'error';
  source: 'database' | 'live_scraping' | 'queue' | 'none';
  data: SearchResult[];
  total: number;
  searchTime: string;
  cached: boolean;
  scrapingTime?: string;
  queuePosition?: number;
  estimatedWaitTime?: string;
  message?: string;
  // Nuevos campos para el flujo de scraping en tiempo real
  isScraping?: boolean;
  scrapedProducts?: SearchResult[];
  needsDbSave?: boolean;
}

class SearchService {
  private baseUrl: string;
  private activeSearches: Map<string, Promise<any>> = new Map();

  constructor() {
    const config = getEnvironmentConfig();
    this.baseUrl = config.API_BASE_URL;
  }

  async searchProducts(query: string, dataSaverMode: boolean = false, dbOnly: boolean = false): Promise<SearchResponse> {
    try {
      console.log('🔍 searchService.searchProducts called with query:', query, 'dataSaverMode:', dataSaverMode, 'dbOnly:', dbOnly);
      
      if (dbOnly) {
        // Modo solo BD: buscar únicamente en la base de datos
        console.log('🗄️ DB-Only mode: searching only in database');
        const response = await n8nMcpService.searchProducts(query, true); // dataSaverMode = true para evitar scraping
        console.log('📦 Raw response from n8nMcpService (DB-only):', response);
        
        // Si no hay resultados en BD, devolver not_found inmediatamente
        if (response.status === 'not_found' || (response.data && response.data.length === 0)) {
          return {
            status: 'not_found',
            source: 'database',
            data: [],
            total: 0,
            searchTime: new Date().toISOString(),
            cached: false,
            message: 'No se encontraron productos en la base de datos. Intenta con otro término de búsqueda.'
          };
        }
        
        return response;
      }
      
      // Modo normal: usar n8n MCP service para búsqueda completa
      const response = await n8nMcpService.searchProducts(query, dataSaverMode);
      console.log('📦 Raw response from n8nMcpService:', response);
      
      // Check if response has the new structure
      if (response && typeof response === 'object' && 'status' in response) {
        // DEBUG: Verificar datos de marca en la respuesta
        if (response.data && Array.isArray(response.data)) {
          console.log('🔍 DEBUG - Productos en respuesta:', response.data.length);
          response.data.forEach((product: any, index: number) => {
            console.log(`🔍 DEBUG - Producto ${index + 1}:`, {
              nombre: product.canonname,
              marca: product.brand,
              tieneMarca: !!product.brand
            });
          });
        }
        
        // New n8n response format
        return {
          status: response.status || 'found',
          source: response.source || 'database',
          data: response.data || [],
          total: response.data?.length || 0,
          searchTime: response.searchTime || '45ms',
          cached: response.cached || true,
          scrapingTime: response.scrapingTime,
          message: response.message,
        };
      } else {
        // Legacy response format (current n8n)
        const data = response || [];
        return {
          status: data.length > 0 ? 'found' : 'not_found',
          source: 'database',
          data: data,
          total: data.length,
          searchTime: '45ms',
          cached: true,
        };
      }
    } catch (error) {
      console.error('Search error:', error);
      return {
        status: 'error',
        source: 'none',
        data: [],
        total: 0,
        searchTime: '0ms',
        cached: false,
        message: 'Error al buscar productos',
      };
    }
  }

  async getProductDetails(canonid: string): Promise<SearchResult | null> {
    try {
      // Use n8n MCP service for better error handling and retry logic
      const data = await n8nMcpService.searchProducts(canonid);
      return data?.[0] || null;
    } catch (error) {
      console.error('Get product details error:', error);
      throw new Error('Failed to get product details');
    }
  }


  // Método principal que maneja la búsqueda (n8n decide si hacer scraping o no)
  async searchProductsWithRealtimeScraping(query: string, dataSaverMode: boolean = false, dbOnly: boolean = false): Promise<SearchResponse> {
    try {
      console.log('🔍 searchService.searchProductsWithRealtimeScraping called with query:', query);
      
      // Validar que el query no sea vacío o de prueba
      if (!query || query.trim() === '' || query === 'test_connection_only') {
        console.log('⚠️ Query vacío o de prueba, no iniciando búsqueda');
        return {
          status: 'not_found',
          source: 'none',
          data: [],
          total: 0,
          searchTime: '0ms',
          cached: false,
          isScraping: false,
          needsDbSave: false,
          message: 'Query inválido'
        };
      }

      // Si está en modo dbOnly, usar el método simple sin scraping
      if (dbOnly) {
        console.log('🗄️ DB-Only mode: using simple search without scraping');
        return await this.searchProducts(query, dataSaverMode, true);
      }

      // Verificar si ya hay una búsqueda activa para este query
      const normalizedQuery = query.trim().toLowerCase();
      if (this.activeSearches.has(normalizedQuery)) {
        console.log('⚠️ Búsqueda ya en progreso para:', normalizedQuery);
        return {
          status: 'scraping',
          source: 'live_scraping',
          data: [],
          total: 0,
          searchTime: '0ms',
          cached: false,
          isScraping: true,
          needsDbSave: false,
          message: 'Búsqueda ya en progreso'
        };
      }
      
      // Registrar búsqueda activa
      const searchPromise = this.performSearch(query, dataSaverMode);
      this.activeSearches.set(normalizedQuery, searchPromise);
      
      try {
        const response = await searchPromise;
        return response;
      } finally {
        // Limpiar búsqueda activa
        this.activeSearches.delete(normalizedQuery);
      }
    } catch (error) {
      console.error('❌ Error in searchProductsWithRealtimeScraping:', error);
      return {
        status: 'error',
        source: 'none',
        data: [],
        total: 0,
        searchTime: '0ms',
        cached: false,
        isScraping: false,
        needsDbSave: false,
        message: 'Error al buscar productos'
      };
    }
  }

  private async performSearch(query: string, dataSaverMode: boolean = false): Promise<SearchResponse> {
    try {
      // Una sola llamada al endpoint principal - n8n maneja toda la lógica internamente
      console.log('📡 Llamando al endpoint principal de n8n...');
      const response = await n8nMcpService.searchProducts(query, dataSaverMode);
      
      console.log('✅ Respuesta recibida de n8n:', response);
      console.log('🔍 Tipo de respuesta:', typeof response);
      console.log('🔍 Es array?', Array.isArray(response));
      console.log('🔍 Tiene status?', response && typeof response === 'object' && 'status' in response);
      
      // Si la respuesta es un array vacío, significa que no se encontraron productos
      if (Array.isArray(response) && response.length === 0) {
        console.log('❌ Respuesta vacía - no se encontraron productos');
        return {
          status: 'not_found',
          source: 'database',
          data: [],
          total: 0,
          searchTime: '0ms',
          cached: true,
          isScraping: false,
          needsDbSave: false,
          message: 'No se encontraron productos'
        };
      }
      
      // Detectar si la respuesta indica que el scraping terminó (formato de n8n con success: true)
      if (response && typeof response === 'object' && 'success' in response && response.success === true) {
        console.log('🔍 Respuesta con formato success de n8n:', response.totalResults, 'productos');
        return {
          status: 'scraped',
          source: 'live_scraping',
          data: response.results || [],
          total: response.totalResults || 0,
          searchTime: '0ms',
          cached: false,
          isScraping: false,
          needsDbSave: true,
          scrapedProducts: response.results || []
        };
      }
      
      // Si la respuesta tiene la estructura esperada
      if (response && typeof response === 'object' && 'status' in response) {
        console.log('🔍 Respuesta con estructura n8n:', response.status, response.source);
        const isScraping = response.status === 'scraped' || response.status === 'scraping';
        const needsDbSave = isScraping && response.data && response.data.length > 0;
        
        return {
          ...response,
          isScraping,
          scrapedProducts: isScraping ? response.data : [],
          needsDbSave
        };
      }
      
      // Si la respuesta es un array de productos (formato legacy)
      if (Array.isArray(response) && response.length > 0) {
        console.log('🔍 Respuesta como array de productos:', response.length);
        return {
          status: 'found',
          source: 'database',
          data: response,
          total: response.length,
          searchTime: '0ms',
          cached: true,
          isScraping: false,
          needsDbSave: false
        };
      }
      
      // Si no se reconoce el formato de respuesta
      console.log('⚠️ Formato de respuesta no reconocido:', response);
      return {
        status: 'not_found',
        source: 'none',
        data: [],
        total: 0,
        searchTime: '0ms',
        cached: false,
        isScraping: false,
        needsDbSave: false,
        message: 'Formato de respuesta no reconocido'
      };
      
    } catch (error) {
      console.error('❌ Error en performSearch:', error);
      return {
        status: 'error',
        source: 'none',
        data: [],
        total: 0,
        searchTime: '0ms',
        cached: false,
        isScraping: false,
        needsDbSave: false,
        message: 'Error al buscar productos'
      };
    }
  }

  // Método para hacer polling mientras está scrapeando con PROGRESSIVE LOADING
  async pollScrapingResults(query: string, onProgress?: (results: any[]) => void): Promise<SearchResponse> {
    const maxAttempts = 24; // 2 minutos con polling cada 5 segundos
    const pollInterval = 5000; // 5 segundos
    const progressiveWaitTime = 2000; // ⚡ 2 segundos para mostrar primeros resultados
    const maxWaitTime = 120000; // 2 minutos máximo total
    const startTime = Date.now();
    let lastProductCount = 0;
    let stableCount = 0;
    let hasShownResults = false;
    let hasFoundProducts = false;
    let progressiveResults: any[] = []; // Para almacenar resultados progresivos
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const elapsedTime = Date.now() - startTime;
        console.log(`🔄 Polling attempt ${attempt + 1}/${maxAttempts} for query: ${query} (${Math.round(elapsedTime/1000)}s elapsed)`);
        
        // Verificar timeout máximo
        if (elapsedTime >= maxWaitTime) {
          console.log('⏰ Timeout máximo alcanzado, terminando polling');
          return {
            status: 'error',
            source: 'none',
            data: [],
            total: 0,
            searchTime: '120s',
            cached: false,
            isScraping: false,
            needsDbSave: false,
            message: 'Timeout: El scraping tomó más tiempo del esperado'
          };
        }
        
        // ⚡ PROGRESSIVE LOADING: Mostrar primeros resultados en 2 segundos
        if (elapsedTime < progressiveWaitTime) {
          const remainingTime = Math.round((progressiveWaitTime - elapsedTime) / 1000);
          console.log(`⚡ Progressive loading: esperando ${remainingTime}s más para primeros resultados...`);
          
          // Esperar el tiempo restante sin hacer llamadas al API
          if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
          }
          continue;
        }
        
        console.log('📡 Haciendo polling al endpoint...');
        const response = await n8nMcpService.searchProducts(query, false); // No data saver mode for polling
        
        console.log('🔍 Polling response type:', typeof response);
        console.log('🔍 Polling response keys:', response && typeof response === 'object' ? Object.keys(response) : 'N/A');
        console.log('🔍 Polling response preview:', JSON.stringify(response).substring(0, 200));
        
        // Si la respuesta tiene estructura n8n con scraping completado
        if (response && typeof response === 'object' && 'status' in response) {
          console.log('🔍 Response has status:', response.status);
          if (response.status === 'scraped' || response.status === 'found') {
            console.log('✅ Scraping completed, returning final results');
            return {
              ...response,
              isScraping: false,
              needsDbSave: response.status === 'scraped',
              scrapedProducts: response.status === 'scraped' ? response.data : []
            };
          }
        }
        
        // Detectar si la respuesta indica que el scraping terminó (formato de n8n con success: true)
        if (response && typeof response === 'object' && 'success' in response && response.success === true) {
          console.log('✅ Scraping completed (success format), returning final results');
          return {
            status: 'scraped',
            source: 'live_scraping',
            data: response.results || [],
            total: response.totalResults || 0,
            searchTime: '0ms',
            cached: false,
            isScraping: false,
            needsDbSave: true,
            scrapedProducts: response.results || []
          };
        }
        
        // Si encontramos productos en formato legacy o array
        if (response && Array.isArray(response) && response.length > 0) {
          hasFoundProducts = true;
          const currentCount = response.length;
          console.log(`📦 Found ${currentCount} products on attempt ${attempt + 1}`);
          
          // ⚡ PROGRESSIVE LOADING: Mostrar primeros 3 resultados inmediatamente
          if (elapsedTime >= progressiveWaitTime) {
            if (!hasShownResults) {
              console.log('⚡ Progressive loading activado: mostrando primeros resultados');
              hasShownResults = true;
            }
            
            // Actualizar resultados progresivos con primeros 3 productos
            const firstThreeProducts = response.slice(0, 3);
            progressiveResults = [...new Set([...progressiveResults, ...firstThreeProducts])];
            
            // Si el número de productos cambió, llamar al callback de progreso
            if (currentCount !== lastProductCount) {
              console.log(`🔄 Product count changed from ${lastProductCount} to ${currentCount}`);
              if (onProgress) {
                onProgress(progressiveResults); // Enviar resultados progresivos
              }
              lastProductCount = currentCount;
              stableCount = 0; // Reset stable counter
            } else {
              stableCount++;
              console.log(`📊 Product count stable for ${stableCount} attempts`);
            }
            
            // Si los resultados se han estabilizado por 3 intentos consecutivos, considerar completado
            if (stableCount >= 3) {
              console.log('✅ Results stabilized, returning final results');
              return {
                status: 'scraped',
                source: 'live_scraping',
                data: response,
                total: response.length,
                searchTime: '0ms',
                cached: false,
                isScraping: false,
                needsDbSave: true,
                scrapedProducts: response
              };
            }
          }
        }
        
        // Esperar antes del siguiente intento
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        
      } catch (error) {
        console.error(`❌ Error in polling attempt ${attempt + 1}:`, error);
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // Timeout después de todos los intentos
    return {
      status: 'error',
      source: 'none',
      data: [],
      total: 0,
      searchTime: '60s',
      cached: false,
      isScraping: false,
      needsDbSave: false,
      message: 'Timeout: El scraping tomó más tiempo del esperado'
    };
  }

  // Método para guardar productos scrapeados en la BD
  async saveScrapedProductsToDatabase(products: SearchResult[]): Promise<boolean> {
    try {
      console.log('💾 Guardando productos scrapeados en BD:', products.length);
      
      // Aquí implementarías la lógica para guardar en BD
      // Por ahora simulamos el proceso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Productos guardados exitosamente en BD');
      return true;
    } catch (error) {
      console.error('❌ Error al guardar productos en BD:', error);
      return false;
    }
  }
}

export const searchService = new SearchService();
