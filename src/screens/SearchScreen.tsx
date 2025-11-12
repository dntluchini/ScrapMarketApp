import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchService, SearchResult } from '../services/searchService';
import { n8nMcpService } from '../services/n8nMcpService';
import PriceComparisonCard from '../components/PriceComparisonCard';
import { GroupedProductCard } from '../components/GroupedProductCard';
import SearchFilters, { SearchFilters as SearchFiltersType } from '../components/SearchFilters';
import { productGroupingService, Product, GroupedProduct } from '../services/productGroupingService';
import ProductSkeleton from '../components/ProductSkeleton';
import ProgressIndicator from '../components/ProgressIndicator';

interface SearchScreenProps {
  navigation: any;
  route?: any;
}

const resolveImageUrl = (payload: any): string | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const candidateValues = [
    payload.imageUrl,
    payload.image_url,
    payload.imageurl,
    payload.imgUrl,
    payload.img_url,
    payload.imgurl,
    payload.image,
    payload.img,
    payload.thumbnail,
    payload.photo,
    payload.picture,
    payload.productImage,
    payload.product_image,
    payload.product_image_url,
  ];

  for (const value of candidateValues) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    if (Array.isArray(value)) {
      const nested = value.find(v => typeof v === 'string' && v.trim().length > 0);
      if (nested) {
        return nested.trim();
      }
    }
  }

  if (Array.isArray(payload.images)) {
    const image = payload.images.find((img: any) => typeof img === 'string' && img.trim().length > 0);
    if (image) {
      return image.trim();
    }
  }

  if (Array.isArray(payload.imageUrls)) {
    const image = payload.imageUrls.find((img: any) => typeof img === 'string' && img.trim().length > 0);
    if (image) {
      return image.trim();
    }
  }

  return undefined;
};

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation, route }) => {
  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersType>({
    priceRange: { min: null, max: null },
    supermarkets: [],
    sortBy: 'relevance',
    inStockOnly: false,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedProducts, setScrapedProducts] = useState<GroupedProduct[]>([]);
  const [needsDbSave, setNeedsDbSave] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [scrapingStartTime, setScrapingStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dataSaverMode = false;
  const dbOnlyMode = false;
  const showEmptyState = !isLoading && !isSearching && !isScraping && filteredGroups.length === 0 && scrapedProducts.length === 0;
  // Test n8n MCP connection on component mount - DISABLED TO PREVENT AUTO-EXECUTIONS
  React.useEffect(() => {
    // Temporarily disable connection test to prevent automatic API calls
    console.log('🔧 Connection test disabled to prevent auto-executions');
    setConnectionStatus('connected'); // Assume connected for now
  }, []);

  // Timer para actualizar el tiempo transcurrido durante el scraping
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isScraping && scrapingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.round((Date.now() - scrapingStartTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isScraping, scrapingStartTime]);

  const [hasPrefetchedData, setHasPrefetchedData] = useState(false);

  // ⭐ PRIORITARIO: Procesar prefetchedGroups PRIMERO (viene de quick_search)
  React.useEffect(() => {
    const prefetched = route?.params?.prefetchedGroups;
    if (prefetched && Array.isArray(prefetched) && prefetched.length > 0) {
      console.log('📦 Processing prefetchedGroups from quick_search:', prefetched.length, 'products');
      setGroupedProducts(prefetched);
      setFilteredGroups(prefetched);
      setProducts([]);
      setScrapedProducts([]);
      setIsLoading(false);
      setHasPrefetchedData(true); // Marcar que hay datos prefetched
      // Limpiar el parámetro después de procesarlo
      navigation.setParams({ prefetchedGroups: undefined });
      console.log('✅ prefetchedGroups processed, will NOT execute search-in-db');
    }
  }, [route?.params?.prefetchedGroups, navigation]);

  // ⭐ Ejecutar búsqueda automática SOLO si NO hay prefetchedGroups
  React.useEffect(() => {
    // Si hay prefetchedGroups, NO ejecutar búsqueda automática
    if (route?.params?.prefetchedGroups && Array.isArray(route.params.prefetchedGroups) && route.params.prefetchedGroups.length > 0) {
      console.log('📦 Has prefetchedGroups, skipping automatic search execution');
      return;
    }
    
    if (route?.params?.initialQuery) {
      const query = route.params.initialQuery;
      setSearchQuery(query);
      // Ejecutar búsqueda automáticamente cuando hay initialQuery (solo si NO hay prefetchedGroups)
      if (query && query.trim().length >= 2) {
        // Usar setTimeout para asegurar que el estado se actualice antes de buscar
        const timeoutId = setTimeout(() => {
          // Ejecutar búsqueda directamente con el query
          executeSearchWithQuery(query);
        }, 200);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [route?.params?.initialQuery, route?.params?.prefetchedGroups]);

  // ⭐ Limpiar input cuando el usuario empieza a escribir después de una búsqueda rápida
  const handleSearchQueryChange = (text: string) => {
    // Si hay datos prefetched y el usuario empieza a escribir, limpiar el input
    if (hasPrefetchedData && text.length > 0 && text !== searchQuery) {
      // Si el usuario está borrando o cambiando el texto, limpiar los datos prefetched
      if (text.length < searchQuery.length || !searchQuery.startsWith(text)) {
        setHasPrefetchedData(false);
        setGroupedProducts([]);
        setFilteredGroups([]);
      }
    }
    setSearchQuery(text);
  };

  // Apply filters when grouped products or filters change
  React.useEffect(() => {
    applyFilters();
  }, [groupedProducts, filters]);

  const applyFilters = () => {
    let filtered = [...groupedProducts];

    // Filter by price range
    if (filters.priceRange.min !== null || filters.priceRange.max !== null) {
      filtered = filtered.filter(group => {
        if (filters.priceRange.min !== null && group.max_price < filters.priceRange.min) {
          return false;
        }
        if (filters.priceRange.max !== null && group.min_price > filters.priceRange.max) {
          return false;
        }
        return true;
      });
    }

    // Filter by supermarkets
    if (filters.supermarkets.length > 0) {
      filtered = filtered.filter(group => {
        return group.products.some(product => 
          filters.supermarkets.includes(product.supermercado.toLowerCase())
        );
      });
    }

    // Filter by stock
    if (filters.inStockOnly) {
      filtered = filtered.filter(group => group.has_stock);
    }

    // Sort groups
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':
          return a.min_price - b.min_price;
        case 'price_desc':
          return b.max_price - a.max_price;
        case 'name':
          return a.display_name.localeCompare(b.display_name);
        case 'relevance':
        default:
          // Sort by relevance using the grouping service
          const relevanceA = productGroupingService.calculateGroupRelevance(a, searchQuery);
          const relevanceB = productGroupingService.calculateGroupRelevance(b, searchQuery);
          return relevanceB - relevanceA;
      }
    });

    setFilteredGroups(filtered);
  };

  const handleFiltersApply = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
  };

  const saveScrapedProducts = async (productsData: any[]) => {
    try {
      console.log('💾 Auto-saving products to database:', productsData.length);
      
      // Convert scraped products to SearchResult format
      const productsToSave = productsData.map((item: any) => ({
        canonid: item.canonid || item.id || `scraped_${Date.now()}`,
        canonname: item.canonname || item.name || item.product_name || '',
        min_price: (item.precio || item.price || item.min_price || item.max_price || 0).toString(),
        max_price: (item.precio || item.price || item.min_price || item.max_price || 0).toString(),
        total_supermarkets: '1',
        last_updated: new Date().toISOString(),
        supermarkets: [{
          super: item.supermercado || item.super_name || item.market || 'UNKNOWN',
          precio: parseFloat(item.precio || item.price || item.min_price || item.max_price || 0),
          price: (item.precio || item.price || item.min_price || item.max_price || 0).toString(),
          stock: item.stock || false,
          url: item.url || item.product_url || '',
          capture: ''
        }],
        brand: item.brand || 'UNKNOWN',
        ean: item.ean || 'NO_EAN',
        exact_weight: item.exact_weight || item.weight || 'UNKNOWN'
      }));
      
      const success = await searchService.saveScrapedProductsToDatabase(productsToSave);
      
      if (success) {
        console.log('✅ Products auto-saved successfully');
      } else {
        console.error('❌ Failed to auto-save products');
      }
    } catch (error) {
      console.error('❌ Error auto-saving products:', error);
    }
  };

  // Función para pull-to-refresh
  const onRefresh = async () => {
    if (isSearching || isScraping || isPolling || !searchQuery.trim()) {
      return;
    }
    
    setIsRefreshing(true);
    console.log('🔄 Pull-to-refresh: reiniciando búsqueda...');
    
    // Limpiar resultados actuales
    setGroupedProducts([]);
    setProducts([]);
    setScrapedProducts([]);
    setIsProgressiveLoading(false);
    
    // Ejecutar nueva búsqueda
    await handleSearch();
    
    setIsRefreshing(false);
  };

  const handleSearch = async () => {
    console.log('🔍 SearchScreen handleSearch called with query:', searchQuery);
    console.log('🔍 User explicitly pressed search button');
    
    // Validar que el query no esté vacío y tenga al menos 2 caracteres
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      console.log('⚠️ Query muy corto o vacío, no iniciando búsqueda');
      Alert.alert('Error', 'Por favor ingresa al menos 2 caracteres para buscar');
      return;
    }
    
    // Llamar a la función interna con el query del estado
    await executeSearchWithQuery(searchQuery);
  };

  // Función interna para ejecutar búsqueda con un query específico
  const executeSearchWithQuery = async (queryToSearch: string) => {
    console.log('🔍 SearchScreen executeSearchWithQuery called with query:', queryToSearch);
    
    // ⭐ NO ejecutar si hay prefetchedGroups (viene de quick_search)
    if (route?.params?.prefetchedGroups && Array.isArray(route.params.prefetchedGroups) && route.params.prefetchedGroups.length > 0) {
      console.log('📦 Has prefetchedGroups, blocking executeSearchWithQuery - will use quick_search data');
      return;
    }
    
    // ⭐ NO ejecutar si ya hay datos prefetched procesados
    if (hasPrefetchedData) {
      console.log('📦 Has prefetched data already processed, blocking executeSearchWithQuery');
      return;
    }
    
    // Validar que el query no esté vacío y tenga al menos 2 caracteres
    if (!queryToSearch.trim() || queryToSearch.trim().length < 2) {
      console.log('⚠️ Query muy corto o vacío, no iniciando búsqueda');
      return;
    }
    
    // Prevenir múltiples búsquedas simultáneas
    if (isSearching || isScraping || isPolling) {
      console.log('🔍 Search already in progress, ignoring request');
      return;
    }
    
    console.log('✅ Auto-search approved, proceeding...');
    
    setIsSearching(true);
    setIsLoading(true);
    setShowSaveButton(false);
    setNeedsDbSave(false);
    setIsProgressiveLoading(false);
    
    // Limpiar productos existentes antes de la nueva búsqueda
    console.log('🧹 Clearing existing products before new search');
    setGroupedProducts([]);
    setProducts([]);
    setScrapedProducts([]);
    
    // ⭐ DETECTAR SI VIENE DE PRODUCTOS POPULARES
    const fromPopularProducts = route?.params?.fromPopularProducts || false;
    if (fromPopularProducts) {
      console.log('🔥 Popular product search detected:', queryToSearch, '- Will use search-popular-products endpoint');
    }
    
    // ⭐ DETECTAR SI ES BÚSQUEDA POR CATEGORÍA
    const isCategory = isCategorySearch(queryToSearch);
    if (isCategory) {
      console.log('🏷️ Category search detected:', queryToSearch, '- Will ONLY use search-in-db, NO scraping');
    }
    
    try {
      // ⭐ Si viene de productos populares, usar search-popular-products en lugar de search-in-db
      if (fromPopularProducts) {
        console.log('🔥 Using search-popular-products endpoint for popular product');
        try {
          const popularResponse = await n8nMcpService.searchPopularProducts(queryToSearch);
          console.log('✅ search-popular-products response type:', typeof popularResponse);
          console.log('✅ search-popular-products response keys:', popularResponse && typeof popularResponse === 'object' ? Object.keys(popularResponse) : 'N/A');
          console.log('✅ search-popular-products response:', JSON.stringify(popularResponse, null, 2).substring(0, 1000));
          
          // Extraer el array de productos de la respuesta (mismo formato que search-in-db)
          let productsData: any = null;
          
          // Usar la misma lógica de extracción que search-in-db
          if (popularResponse && typeof popularResponse === 'object' && !Array.isArray(popularResponse)) {
            if ((popularResponse.status === 'success' || popularResponse.status === 'found') && Array.isArray(popularResponse.data)) {
              productsData = popularResponse.data;
              console.log('✅ Found products via search-popular-products (format 1b - direct object with data):', productsData.length);
            } else if (Array.isArray(popularResponse.data)) {
              productsData = popularResponse.data;
              console.log('✅ Found products via search-popular-products (format 1c - object with data array):', productsData.length);
            }
          } else if (Array.isArray(popularResponse) && popularResponse.length > 0) {
            if (popularResponse[0] && typeof popularResponse[0] === 'object' && Array.isArray(popularResponse[0].supermarkets)) {
              productsData = popularResponse;
              console.log('✅ Found products via search-popular-products (format 3e - direct array of grouped products):', productsData.length);
            } else {
              productsData = popularResponse;
              console.log('✅ Found products via search-popular-products (format 3b - direct array):', productsData.length);
            }
          }
          
          if (productsData && Array.isArray(productsData) && productsData.length > 0) {
            console.log('✅ Processing', productsData.length, 'products from search-popular-products with query:', queryToSearch);
            setSearchQuery(queryToSearch);
            await processSearchResults(productsData, false, true, false, queryToSearch);
            setIsSearching(false);
            setIsLoading(false);
            console.log('✅ Search completed with popular products results, stopping here');
            return;
          } else {
            console.log('⚠️ search-popular-products returned no products');
            setIsSearching(false);
            setIsLoading(false);
            return;
          }
        } catch (popularError) {
          console.warn('⚠️ search-popular-products failed:', popularError);
          setIsSearching(false);
          setIsLoading(false);
          return;
        }
      }
      
      // Primero intentar búsqueda en BD usando search-in-db (solo si NO viene de productos populares)
      console.log('🔍 Trying search-in-db endpoint first');
      try {
        const dbResponse = await n8nMcpService.searchProductsInDatabaseOnly(queryToSearch);
        console.log('✅ search-in-db response type:', typeof dbResponse);
        console.log('✅ search-in-db response keys:', dbResponse && typeof dbResponse === 'object' ? Object.keys(dbResponse) : 'N/A');
        console.log('✅ search-in-db response:', JSON.stringify(dbResponse, null, 2).substring(0, 1000));
        
        // Extraer el array de productos de la respuesta
        let productsData: any = null;
        
        // ⭐ CASO 1 (PRIORITARIO): Respuesta con estructura { status: 'success', items: [...] } (formato quick_search)
        if (dbResponse && typeof dbResponse === 'object' && !Array.isArray(dbResponse)) {
          // Verificar si tiene items array
          if ((dbResponse.status === 'success' || dbResponse.status === 'found') && Array.isArray(dbResponse.items)) {
            console.log('✅ Detected format with items array');
            console.log('✅ Found products in database via search-in-db (format 1 - items array):', dbResponse.items.length, 'items');
            // Extraer productos de cada item
            const allProducts: any[] = [];
            dbResponse.items.forEach((item: any) => {
              if (Array.isArray(item.products)) {
                console.log(`  📦 Item "${item.query || 'unknown'}": ${item.products.length} products`);
                allProducts.push(...item.products);
              } else if (item.products && typeof item.products === 'object') {
                // Si products es un objeto único, convertirlo a array
                console.log(`  📦 Item "${item.query || 'unknown'}": 1 product (object)`);
                allProducts.push(item.products);
              }
            });
            productsData = allProducts;
            console.log('✅ Extracted', productsData.length, 'total products from items array');
          }
          // ⭐ NUEVO: Verificar si tiene data array con productos ya agrupados (formato directo)
          else if ((dbResponse.status === 'success' || dbResponse.status === 'found') && Array.isArray(dbResponse.data)) {
            productsData = dbResponse.data;
            console.log('✅ Found products in database via search-in-db (format 1b - direct object with data):', productsData.length);
            // Verificar si el primer item tiene supermarkets (ya agrupado)
            if (productsData.length > 0 && productsData[0] && productsData[0].supermarkets && Array.isArray(productsData[0].supermarkets)) {
              console.log('✅ Products are already grouped (have supermarkets array)');
            }
          }
          // ⭐ NUEVO: Verificar si es un array directo dentro del objeto (sin status)
          else if (Array.isArray(dbResponse.data)) {
            productsData = dbResponse.data;
            console.log('✅ Found products in database via search-in-db (format 1c - object with data array, no status):', productsData.length);
          }
        }
        // Caso 2: Respuesta dentro de un array con un objeto json (n8n webhook response format)
        else if (Array.isArray(dbResponse) && dbResponse.length > 0 && dbResponse[0] && dbResponse[0].json) {
          const jsonData = dbResponse[0].json;
          // Verificar si tiene items array
          if ((jsonData.status === 'success' || jsonData.status === 'found') && Array.isArray(jsonData.items)) {
            console.log('✅ Found products in database via search-in-db (format 2a - array with json.items):', jsonData.items.length, 'items');
            const allProducts: any[] = [];
            jsonData.items.forEach((item: any) => {
              if (Array.isArray(item.products)) {
                allProducts.push(...item.products);
              } else if (item.products && typeof item.products === 'object') {
                allProducts.push(item.products);
              }
            });
            productsData = allProducts;
            console.log('✅ Extracted', productsData.length, 'total products from json.items array');
          }
          // Verificar si tiene data array
          else if (jsonData.status === 'found' && Array.isArray(jsonData.data)) {
            productsData = jsonData.data;
            console.log('✅ Found products in database via search-in-db (format 2b - array with json.data):', productsData.length);
          }
        }
        // Caso 3: Respuesta es directamente un array de productos
        else if (Array.isArray(dbResponse) && dbResponse.length > 0) {
          // Verificar si es un array de objetos con estructura { status, data, ... }
          if (dbResponse[0] && typeof dbResponse[0] === 'object' && dbResponse[0].status === 'found' && Array.isArray(dbResponse[0].data)) {
            productsData = dbResponse[0].data;
            console.log('✅ Found products in database via search-in-db (format 3a - array with status/data):', productsData.length);
          }
          // ⭐ NUEVO: Verificar si es array de objetos con json wrapper [{ json: { data: [...] } }]
          else if (dbResponse[0] && typeof dbResponse[0] === 'object' && dbResponse[0].json) {
            const jsonData = dbResponse[0].json;
            if (Array.isArray(jsonData.data)) {
              productsData = jsonData.data;
              console.log('✅ Found products in database via search-in-db (format 3c - array with json.data):', productsData.length);
            } else if (Array.isArray(jsonData)) {
              productsData = jsonData;
              console.log('✅ Found products in database via search-in-db (format 3d - array with json as array):', productsData.length);
            }
          }
          // ⭐ NUEVO: Verificar si el primer elemento tiene supermarkets (array directo de productos agrupados)
          else if (dbResponse[0] && typeof dbResponse[0] === 'object' && Array.isArray(dbResponse[0].supermarkets)) {
            productsData = dbResponse;
            console.log('✅ Found products in database via search-in-db (format 3e - direct array of grouped products):', productsData.length);
          } else {
            // Array directo de productos (ya agrupados)
            productsData = dbResponse;
            console.log('✅ Found products in database via search-in-db (format 3b - direct array):', productsData.length);
            // Verificar estructura del primer elemento
            if (productsData[0] && typeof productsData[0] === 'object') {
              console.log('🔍 First item keys:', Object.keys(productsData[0]));
              console.log('🔍 First item has supermarkets?', !!(productsData[0].supermarkets && Array.isArray(productsData[0].supermarkets)));
            }
          }
        }
        // Caso 4: Respuesta dentro de un objeto json (n8n puede envolver la respuesta)
        else if (dbResponse && typeof dbResponse === 'object' && dbResponse.json && dbResponse.json.status === 'found' && Array.isArray(dbResponse.json.data)) {
          productsData = dbResponse.json.data;
          console.log('✅ Found products in database via search-in-db (format 4 - nested json):', productsData.length);
        }
        
        // ⭐ CRÍTICO: Verificar si tenemos productos válidos antes de continuar
        if (productsData && Array.isArray(productsData) && productsData.length > 0) {
          console.log('✅ Processing', productsData.length, 'products from search-in-db with query:', queryToSearch);
          // ⭐ LOG DETALLADO: Verificar que tenemos todos los productos
          console.log('🔍 Full productsData array length:', productsData.length);
          productsData.forEach((product, index) => {
            console.log(`  📦 Product ${index + 1}:`, {
              canonname: product.canonname || 'NO NAME',
              hasSupermarkets: !!(product.supermarkets && Array.isArray(product.supermarkets)),
              supermarketsCount: product.supermarkets?.length || 0
            });
          });
          // Log detallado del primer producto para debugging
          if (productsData[0]) {
            console.log('🔍 First product structure:', {
              hasCanonname: !!productsData[0].canonname,
              hasSupermarkets: !!(productsData[0].supermarkets && Array.isArray(productsData[0].supermarkets)),
              supermarketsCount: productsData[0].supermarkets?.length || 0,
              keys: Object.keys(productsData[0])
            });
          }
          // Asegurar que searchQuery esté actualizado antes de procesar
          setSearchQuery(queryToSearch);
          // Pasar fromDatabase=true y queryOverride para desactivar el filtro de relevancia
          // También detectar si es búsqueda por categoría
          await processSearchResults(productsData, false, true, false, queryToSearch);
          // ⭐ CRÍTICO: Detener estados de búsqueda y salir temprano
          setIsSearching(false);
          setIsLoading(false);
          console.log('✅ Search completed with database results, stopping here');
          return; // Salir temprano si encontramos resultados
        } 
        // Si dbResponse es un array vacío, también detener aquí
        else if (Array.isArray(dbResponse) && dbResponse.length === 0) {
          console.log('⚠️ search-in-db returned empty array, no products found');
          setIsSearching(false);
          setIsLoading(false);
          return; // No continuar con scraping si la respuesta fue vacía
        }
        // Si tiene status 'not_found', también detener
        else if (dbResponse && typeof dbResponse === 'object' && dbResponse.status === 'not_found') {
          console.log('⚠️ No products found in database via search-in-db (status: not_found)');
          setIsSearching(false);
          setIsLoading(false);
          return; // No continuar con scraping
        } 
        // Si no se pudo parsear la respuesta pero no es un error, también detener
        else if (!productsData) {
          console.log('⚠️ Could not extract products from search-in-db response, but response exists');
          console.log('⚠️ Response type:', typeof dbResponse, Array.isArray(dbResponse) ? 'array' : 'object');
          console.log('⚠️ Response sample:', JSON.stringify(dbResponse, null, 2).substring(0, 500));
          setIsSearching(false);
          setIsLoading(false);
          // ⭐ Si es búsqueda por categoría, NO continuar con scraping
          if (isCategory) {
            console.log('🏷️ Category search: Stopping here, will NOT call search-products-complete');
            return;
          }
          return; // No continuar con scraping si no pudimos parsear
        }
      } catch (dbError) {
        console.warn('⚠️ search-in-db failed:', dbError);
        // ⭐ Si es búsqueda por categoría, NO continuar con scraping aunque haya error
        if (isCategory) {
          console.log('🏷️ Category search: search-in-db failed, but will NOT fallback to scraping');
          setIsSearching(false);
          setIsLoading(false);
          return;
        }
        // Solo continuar con scraping si NO es categoría y hubo un error real
      }
      
      // ⭐ Solo llegar aquí si:
      // 1. NO es búsqueda por categoría
      // 2. Y search-in-db falló con un error real (no respuesta vacía)
      if (isCategory) {
        console.log('🏷️ Category search completed, will NOT call search-products-complete');
        return;
      }
      
      console.log('🔍 Using new realtime scraping flow');
      
      // Si search-in-db no funcionó o no encontró resultados, usar el flujo normal
      const initialResponse = await searchService.searchProductsWithRealtimeScraping(queryToSearch, dataSaverMode, dbOnlyMode);
      console.log('🔍 Initial response from searchService:', initialResponse);
      console.log('🔍 Initial response.data type:', typeof initialResponse.data);
      console.log('🔍 Initial response.data isArray:', Array.isArray(initialResponse.data));
      
      // Verificar el estado de la respuesta
      if (initialResponse.status === 'found') {
        // Productos encontrados en BD
        console.log('✅ Productos encontrados en BD - initialResponse.data:', typeof initialResponse.data, initialResponse.data);
        
        // Extraer el array de productos de la respuesta anidada
        let productsData: any = initialResponse.data;
        console.log('🔍 productsData structure:', typeof productsData, productsData);
        
        // Verificar si es un objeto con estructura anidada
        if (productsData && typeof productsData === 'object' && !Array.isArray(productsData)) {
          // ⭐ CASO: Formato con items array { status: 'success', items: [...] }
          if (Array.isArray(productsData.items)) {
            console.log('🔍 Extracting products from items array:', productsData.items.length, 'items');
            const allProducts: any[] = [];
            productsData.items.forEach((item: any) => {
              if (Array.isArray(item.products)) {
                allProducts.push(...item.products);
              } else if (item.products && typeof item.products === 'object') {
                allProducts.push(item.products);
              }
            });
            productsData = allProducts;
            console.log('🔍 Extracted', productsData.length, 'products from items');
          }
          // Caso: estructura { data: [...] }
          else if (Array.isArray(productsData.data)) {
            console.log('🔍 Extracting nested data array:', productsData.data.length, 'products');
            productsData = productsData.data;
            // Verificar si los productos ya están agrupados
            if (productsData.length > 0 && productsData[0] && productsData[0].supermarkets && Array.isArray(productsData[0].supermarkets)) {
              console.log('✅ Products are already grouped (have supermarkets array)');
            }
          }
        } else if (Array.isArray(productsData) && productsData.length === 1 && productsData[0] && typeof productsData[0] === 'object' && productsData[0].data && Array.isArray(productsData[0].data)) {
          console.log('🔍 Extracting nested data from single-item array:', productsData[0].data.length, 'products');
          productsData = productsData[0].data;
        } else if (Array.isArray(productsData)) {
          console.log('🔍 Data is already an array:', productsData.length, 'products');
          // Verificar si los productos ya están agrupados
          if (productsData.length > 0 && productsData[0] && productsData[0].supermarkets && Array.isArray(productsData[0].supermarkets)) {
            console.log('✅ Products are already grouped (have supermarkets array)');
            console.log('🔍 First product has', productsData[0].supermarkets.length, 'supermarkets');
          }
        } else {
          console.log('🔍 No nested structure found, using data as-is');
        }
        
        console.log('🔍 Final productsData to process:', typeof productsData, Array.isArray(productsData) ? productsData.length : 'not array');
        
        await processSearchResults(productsData, false, false, false, queryToSearch);
        
                  } else if (initialResponse.status === 'scraped') {
                    // Productos scrapeados en tiempo real
                    console.log('🔄 Productos scrapeados en tiempo real:', initialResponse.data.length);
                    setIsScraping(false);
                    setScrapingStartTime(null);
                    
                    // Extraer el array de productos de la respuesta anidada
                    let productsData: any = initialResponse.data;
                    if (productsData && typeof productsData === 'object' && productsData.data && Array.isArray(productsData.data)) {
                      console.log('🔍 Extracting nested data array for scraped products:', productsData.data.length, 'products');
                      productsData = productsData.data;
                    }
                    
                    // Guardar automáticamente sin mostrar botón
                    await processSearchResults(productsData, true);
                    // Auto-save: llamar al endpoint de guardar productos
                    await saveScrapedProducts(initialResponse.data);
        
      } else if ((initialResponse.status === 'scraping' || initialResponse.status === 'not_found') && !dbOnlyMode) {
        // Iniciar scraping o no se encontraron productos - usar polling (solo si no está en modo dbOnly)
        console.log('⏳ Iniciando scraping con polling...');
        setIsScraping(true);
        setScrapingStartTime(Date.now());
        setNeedsDbSave(true);
        
        // Usar polling para mostrar resultados en tiempo real con PROGRESSIVE LOADING
        setIsPolling(true);
        const finalResponse = await searchService.pollScrapingResults(
          queryToSearch,
          async (partialResults) => {
            // ⚡ PROGRESSIVE LOADING: Mostrar primeros resultados inmediatamente
            console.log('⚡ Progressive loading: mostrando productos parciales:', partialResults.length);
            setIsProgressiveLoading(true);
            
            // Extraer el array de productos de la respuesta anidada
            let productsData: any = partialResults;
            if (productsData && typeof productsData === 'object' && productsData.data && Array.isArray(productsData.data)) {
              console.log('🔍 Extracting nested data array for partial results:', productsData.data.length, 'products');
              productsData = productsData.data;
            }
            
            await processSearchResults(productsData, true);
          }
        );
        setIsPolling(false);
        
        console.log('🔍 Final response from polling:', finalResponse);
        
                    if (finalResponse.status === 'found' || finalResponse.status === 'scraped') {
                      setIsScraping(false);
                      setScrapingStartTime(null);
                      if (finalResponse.status === 'scraped') {
                        // Auto-save: llamar al endpoint de guardar productos
                        await saveScrapedProducts(finalResponse.data);
                      }
                      
                      // Extraer el array de productos de la respuesta anidada
                      let productsData: any = finalResponse.data;
                      if (productsData && typeof productsData === 'object' && productsData.data && Array.isArray(productsData.data)) {
                        console.log('🔍 Extracting nested data array for final response:', productsData.data.length, 'products');
                        productsData = productsData.data;
                      }
                      
                      await processSearchResults(productsData, finalResponse.status === 'scraped');
                    } else {
          // No se encontraron productos después del polling
          console.log('❌ No se encontraron productos después del scraping');
          setGroupedProducts([]);
          setProducts([]);
          setScrapedProducts([]);
        }
        
      } else {
        // No se encontraron productos
        console.log('❌ No se encontraron productos');
        setGroupedProducts([]);
        setProducts([]);
        setScrapedProducts([]);
        
        // Mostrar mensaje específico para modo dbOnly
        if (dbOnlyMode) {
          Alert.alert(
            'Sin resultados', 
            'No se encontraron productos en la base de datos. Intenta con otro término de búsqueda o desactiva el modo "Solo BD" para buscar en tiempo real.'
          );
        }
      }
      
    } catch (error) {
      Alert.alert('Error', 'No se pudo realizar la búsqueda. Verifica tu conexión.');
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
      setIsPolling(false);
      setScrapingStartTime(null);
    }
  };

  // Lista de categorías conocidas para detectar búsquedas por categoría
  // Estas son las mismas que se usan en HomeScreen para quick search
  const CATEGORY_QUERIES = ['limpieza', 'vegetales', 'carnes', 'bebidas', 'lácteos', 'lacteos', 'panadería', 'panaderia', 'gaseosas', 'galletitas', 'alfajores'];
  
  // Función para detectar si el query es una búsqueda por categoría
  const isCategorySearch = (query: string): boolean => {
    const normalizedQuery = query.trim().toLowerCase();
    return CATEGORY_QUERIES.some(cat => normalizedQuery === cat || normalizedQuery.includes(cat));
  };

  // Función auxiliar para procesar resultados de búsqueda
  const processSearchResults = async (productsArray: any[], isScraped: boolean, fromDatabase: boolean = false, isCategorySearch: boolean = false, queryOverride?: string) => {
    // Detectar si es búsqueda por categoría basándose en el query
    // Usar queryOverride si se proporciona (para evitar problemas con estado asíncrono)
    const queryToCheck = (queryOverride || searchQuery).trim().toLowerCase();
    const detectedCategorySearch = CATEGORY_QUERIES.some(cat => queryToCheck === cat || queryToCheck.includes(cat));
    const shouldSkipRelevanceFilter = fromDatabase || isCategorySearch || detectedCategorySearch;
    
    console.log('🔍 Processing search results:', productsArray.length, 'isScraped:', isScraped, 'fromDatabase:', fromDatabase, 'isCategorySearch:', isCategorySearch || detectedCategorySearch, 'query:', queryToCheck);
    
    let groupedProducts: GroupedProduct[] = [];
    
    if (productsArray.length > 0) {
      // Check if first item has 'supermarkets' array (already grouped from DB)
      const firstItem = productsArray[0];
      console.log('🔍 First item structure:', {
        hasSupermarkets: !!(firstItem.supermarkets && Array.isArray(firstItem.supermarkets)),
        supermarketsLength: firstItem.supermarkets?.length,
        canonname: firstItem.canonname,
        brand: firstItem.brand
      });
      
      if (firstItem.supermarkets && Array.isArray(firstItem.supermarkets)) {
        console.log('🔍 Data is already grouped from database');
        
        // Convert grouped data to GroupedProduct interface
        console.log('🔍 Converting', productsArray.length, 'database products to GroupedProduct');
        console.log('🔍 Full productsArray received:', productsArray.length, 'items');
        // ⭐ LOG: Verificar cada producto antes de procesar
        productsArray.forEach((item, idx) => {
          console.log(`  📦 Processing product ${idx + 1}/${productsArray.length}:`, {
            canonname: item.canonname || 'NO NAME',
            hasSupermarkets: !!(item.supermarkets && Array.isArray(item.supermarkets)),
            supermarketsCount: item.supermarkets?.length || 0
          });
        });
        groupedProducts = productsArray.map((item: any, index: number) => {
          console.log(`🔍 Mapping product ${index + 1}/${productsArray.length}: ${item.canonname || 'NO NAME'}`);
          const groupImage = resolveImageUrl(item);
          const mappedProducts: Product[] = item.supermarkets.map((supermarket: any) => {
            const productImage = resolveImageUrl(supermarket) || groupImage;
            
            // Log completo del objeto supermarket para debugging
            console.log('🔍 Supermarket object:', {
              super: supermarket.super,
              precio: supermarket.precio,
              hasAddToCartLink: !!(supermarket.addToCartLink || supermarket.add_to_cart_link),
              addToCartLink: supermarket.addToCartLink || supermarket.add_to_cart_link,
              hasSellers: !!(supermarket.sellers && Array.isArray(supermarket.sellers)),
              sellersCount: supermarket.sellers?.length || 0,
              fullSupermarket: JSON.stringify(supermarket, null, 2) // Log completo como string para ver toda la estructura
            });
            
            // Extraer addToCartLink desde múltiples posibles ubicaciones y formatos
            let addToCartLink: string | undefined = undefined;
            
            // Buscar en todas las posibles variaciones del nombre del campo
            const possibleFieldNames = [
              'addToCartLink',
              'add_to_cart_link',
              'addToCart',
              'add_to_cart',
              'cartLink',
              'cart_link',
              'addCartLink',
              'add_cart_link'
            ];
            
            // Primero verificar en el nivel de supermarket directamente (formato desde SQL/reg_prices)
            for (const fieldName of possibleFieldNames) {
              if (supermarket[fieldName] && typeof supermarket[fieldName] === 'string' && supermarket[fieldName].trim() !== '') {
                addToCartLink = supermarket[fieldName];
                console.log(`🔍 Found addToCartLink in supermarket level (as ${fieldName}):`, addToCartLink);
                break;
              }
            }
            
            // Si no está en el nivel de supermarket, buscar en sellers
            if (!addToCartLink && supermarket.sellers && Array.isArray(supermarket.sellers) && supermarket.sellers.length > 0) {
              for (const seller of supermarket.sellers) {
                for (const fieldName of possibleFieldNames) {
                  if (seller[fieldName] && typeof seller[fieldName] === 'string' && seller[fieldName].trim() !== '') {
                    addToCartLink = seller[fieldName];
                    console.log(`🔍 Found addToCartLink in seller (as ${fieldName}):`, addToCartLink);
                    break;
                  }
                }
                if (addToCartLink) break;
              }
            }
            
            // También buscar en sellerName si está disponible (puede tener el link en el nombre)
            if (!addToCartLink && supermarket.sellerName) {
              console.log('🔍 sellerName found but no addToCartLink:', supermarket.sellerName);
            }
            
            if (!addToCartLink) {
              console.log('⚠️ No addToCartLink found for supermarket:', supermarket.super);
              console.log('⚠️ Available keys in supermarket:', Object.keys(supermarket));
              console.log('⚠️ Full supermarket object:', JSON.stringify(supermarket, null, 2));
            } else {
              console.log('✅ addToCartLink successfully extracted for', supermarket.super, ':', addToCartLink);
            }
            
            // Si no se encontró addToCartLink, intentar construirlo desde la URL
            if (!addToCartLink && supermarket.url) {
              const url = supermarket.url;
              // Intentar construir el link de agregar al carrito basándose en el dominio
              if (url.includes('vea.com.ar')) {
                // Extraer SKU de la URL si es posible
                const skuMatch = url.match(/sku=(\d+)/);
                if (skuMatch) {
                  const price = Math.round(parseFloat(supermarket.precio || 0) * 100);
                  addToCartLink = `https://www.vea.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=34&price=${price}&cv=_&sc=34`;
                  console.log('🔧 Constructed addToCartLink for Vea from URL:', addToCartLink);
                }
              } else if (url.includes('jumbo.com.ar')) {
                const skuMatch = url.match(/sku=(\d+)/);
                if (skuMatch) {
                  const price = Math.round(parseFloat(supermarket.precio || 0) * 100);
                  addToCartLink = `https://www.jumbo.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=32&price=${price}&cv=_&sc=32`;
                  console.log('🔧 Constructed addToCartLink for Jumbo from URL:', addToCartLink);
                }
              } else if (url.includes('disco.com.ar')) {
                const skuMatch = url.match(/sku=(\d+)/);
                if (skuMatch) {
                  const price = Math.round(parseFloat(supermarket.precio || 0) * 100);
                  addToCartLink = `https://www.disco.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=33&price=${price}&cv=_&sc=33`;
                  console.log('🔧 Constructed addToCartLink for Disco from URL:', addToCartLink);
                }
              }
            }
            
            const mappedProduct: Product = {
              canonid: item.canonid || '',
              canonname: item.canonname || '',
              brand: item.brand || undefined,
              brandId: item.brandId || undefined,
              precio: parseFloat(supermarket.precio || item.min_price || 0),
              supermercado: supermarket.super || 'unknown',
              ean: item.ean || 'NO_EAN',
              exact_weight: item.exact_weight || 'UNKNOWN',
              stock: supermarket.stock !== undefined ? Boolean(supermarket.stock) : true,
              url: supermarket.url || '',
              sku: '',
              skuRef: '',
              storeBase: '',
              site: '',
              relevance: 0,
              imageUrl: productImage,
              addToCartLink: addToCartLink || undefined, // Asegurar que se asigne correctamente
            };
            
            // Log para verificar que addToCartLink se mapeó correctamente
            console.log('🔍 Mapped product for', supermarket.super, ':', {
              canonname: mappedProduct.canonname,
              supermercado: mappedProduct.supermercado,
              hasAddToCartLink: !!mappedProduct.addToCartLink,
              addToCartLink: mappedProduct.addToCartLink,
              url: mappedProduct.url
            });
            
            // Verificación final: asegurar que addToCartLink esté en el objeto
            if (!mappedProduct.addToCartLink) {
              console.error('❌ ERROR: addToCartLink is still undefined after mapping for', supermarket.super);
              console.error('❌ Supermarket object keys:', Object.keys(supermarket));
              console.error('❌ Supermarket object:', JSON.stringify(supermarket, null, 2));
            }
            
            return mappedProduct;
          });

          const bestPrice =
            mappedProducts.length > 0
              ? mappedProducts.reduce((best, current) =>
                  current.precio < best.precio ? current : best
                )
              : undefined;

          return {
            ean: item.ean || 'NO_EAN',
            exact_weight: item.exact_weight || 'UNKNOWN',
            brand: item.brand || undefined,
            brandId: item.brandId || undefined,
            products: mappedProducts,
            min_price: parseFloat(item.min_price || 0),
            max_price: parseFloat(item.max_price || 0),
            total_supermarkets: item.total_supermarkets || item.supermarkets.length,
            alternative_names: item.alternative_names || [item.canonname],
            display_name: item.canonname || '',
            has_stock: mappedProducts.some((s: Product) => s.stock),
            imageUrl: groupImage || bestPrice?.imageUrl,
            best_price: bestPrice,
          };
        });
        
        console.log('🔍 Converted to', groupedProducts.length, 'GroupedProducts');
        // ⭐ LOG CRÍTICO: Verificar que todos los productos se procesaron
        if (groupedProducts.length !== productsArray.length) {
          console.error(`❌ ERROR: Expected ${productsArray.length} products but only got ${groupedProducts.length} grouped products!`);
        } else {
          console.log(`✅ Successfully converted all ${productsArray.length} products to grouped products`);
        }
        // Log de cada producto agrupado
        groupedProducts.forEach((group, idx) => {
          console.log(`  ✅ Grouped product ${idx + 1}/${groupedProducts.length}: ${group.display_name} (${group.total_supermarkets} supermarkets)`);
        });
        
        // Aplicar filtrado de relevancia a productos ya agrupados de BD
        // NOTA: NO aplicar filtro de relevancia si:
        // 1. Los productos vienen directamente de search-in-db (fromDatabase=true)
        // 2. Es una búsqueda por categoría (isCategorySearch=true o query es una categoría conocida)
        // ya que fueron buscados específicamente y deben mostrarse todos
        if (!shouldSkipRelevanceFilter) {
          const currentQuery = searchQuery.trim();
          if (currentQuery && currentQuery.length >= 2) {
            const filteredGroups = groupedProducts.filter(group => {
              const relevance = productGroupingService.calculateGroupRelevance(group, currentQuery);
              // Umbral estándar para productos scrapeados
              const isRelevant = relevance >= 25;
              
              if (!isRelevant) {
                console.log(`❌ Filtered out group: "${group.display_name}" (relevance: ${relevance.toFixed(1)}, query: "${currentQuery}")`);
              } else {
                console.log(`✅ Kept group: "${group.display_name}" (relevance: ${relevance.toFixed(1)})`);
              }
              
              return isRelevant;
            });
            
            console.log(`🔍 Filtered grouped products from ${groupedProducts.length} to ${filteredGroups.length}`);
            groupedProducts = filteredGroups;
          } else {
            console.log('⚠️ No search query available for relevance filtering, showing all products');
          }
        } else {
          const reason = fromDatabase ? 'database search' : (isCategorySearch || detectedCategorySearch ? 'category search' : 'unknown');
          console.log(`✅ Skipping relevance filter (${reason}) - showing all`, groupedProducts.length, 'products');
        }
        
        // Set individual products for compatibility
        const individualProducts: Product[] = [];
        groupedProducts.forEach(group => {
          individualProducts.push(...group.products);
        });
        setProducts(individualProducts);
        
      } else {
        console.log('🔍 Data is individual products from scraping');
        
        // Convert to Product interface (individual products)
        const products: Product[] = productsArray.map((item: any, index: number) => {
          console.log('🔍 Mapping individual product item:', {
            canonname: item.canonname || item.name,
            supermercado: item.supermercado || item.super_name,
            hasSellers: !!(item.sellers && Array.isArray(item.sellers)),
            sellersCount: item.sellers?.length || 0,
            hasAddToCartLink: !!(item.addToCartLink || item.add_to_cart_link),
            url: item.url || item.product_url,
            fullItem: JSON.stringify(item, null, 2)
          });
          
          // Extraer addToCartLink desde múltiples posibles ubicaciones y formatos
          let addToCartLink: string | undefined = undefined;
          
          // Buscar en todas las posibles variaciones del nombre del campo
          const possibleFieldNames = [
            'addToCartLink',
            'add_to_cart_link',
            'addToCart',
            'add_to_cart',
            'cartLink',
            'cart_link',
            'addCartLink',
            'add_cart_link'
          ];
          
          // Primero verificar en el nivel del item directamente
          for (const fieldName of possibleFieldNames) {
            if (item[fieldName] && typeof item[fieldName] === 'string' && item[fieldName].trim() !== '') {
              addToCartLink = item[fieldName];
              console.log(`🔍 Found addToCartLink in item level (as ${fieldName}):`, addToCartLink);
              break;
            }
          }
          
          // Si no está en el nivel del item, buscar en sellers
          if (!addToCartLink && item.sellers && Array.isArray(item.sellers) && item.sellers.length > 0) {
            for (const seller of item.sellers) {
              for (const fieldName of possibleFieldNames) {
                if (seller[fieldName] && typeof seller[fieldName] === 'string' && seller[fieldName].trim() !== '') {
                  addToCartLink = seller[fieldName];
                  console.log(`🔍 Found addToCartLink in seller (as ${fieldName}):`, addToCartLink);
                  break;
                }
              }
              if (addToCartLink) break;
            }
          }
          
          // Si no se encontró addToCartLink, intentar construirlo desde la URL
          if (!addToCartLink && (item.url || item.product_url)) {
            const url = item.url || item.product_url;
            if (url.includes('vea.com.ar')) {
              const skuMatch = url.match(/sku=(\d+)/) || url.match(/\/(\d+)\//);
              if (skuMatch) {
                const price = Math.round(parseFloat(item.precio || item.price || 0) * 100);
                addToCartLink = `https://www.vea.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=34&price=${price}&cv=_&sc=34`;
                console.log('🔧 Constructed addToCartLink for Vea from URL:', addToCartLink);
              }
            } else if (url.includes('jumbo.com.ar')) {
              const skuMatch = url.match(/sku=(\d+)/) || url.match(/\/(\d+)\//);
              if (skuMatch) {
                const price = Math.round(parseFloat(item.precio || item.price || 0) * 100);
                addToCartLink = `https://www.jumbo.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=32&price=${price}&cv=_&sc=32`;
                console.log('🔧 Constructed addToCartLink for Jumbo from URL:', addToCartLink);
              }
            } else if (url.includes('disco.com.ar')) {
              const skuMatch = url.match(/sku=(\d+)/) || url.match(/\/(\d+)\//);
              if (skuMatch) {
                const price = Math.round(parseFloat(item.precio || item.price || 0) * 100);
                addToCartLink = `https://www.disco.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=33&price=${price}&cv=_&sc=33`;
                console.log('🔧 Constructed addToCartLink for Disco from URL:', addToCartLink);
              }
            } else if (url.includes('carrefour.com.ar')) {
              const skuMatch = url.match(/sku=(\d+)/) || url.match(/\/(\d+)\//);
              if (skuMatch) {
                const price = Math.round(parseFloat(item.precio || item.price || 0) * 100);
                addToCartLink = `https://www.carrefour.com.ar/checkout/cart/add?sku=${skuMatch[1]}&qty=1&seller=1&sc=35&price=${price}&cv=_&sc=35`;
                console.log('🔧 Constructed addToCartLink for Carrefour from URL:', addToCartLink);
              }
            }
          }
          
          if (!addToCartLink) {
            console.log('⚠️ No addToCartLink found for individual product:', item.canonname || item.name);
            console.log('⚠️ Available keys in item:', Object.keys(item));
            console.log('⚠️ Full item object:', JSON.stringify(item, null, 2));
          } else {
            console.log('✅ addToCartLink successfully extracted for individual product:', addToCartLink);
          }
          
          const mappedProduct: Product = {
            canonid: item.canonid || item.id || `scraped_${index}`,
            canonname: item.canonname || item.name || item.product_name || '',
            brand: item.brand || undefined,
            brandId: item.brandId || undefined,
            precio: parseFloat(item.precio || item.price || item.min_price || item.max_price || 0),
            supermercado: item.supermercado || item.super_name || item.market || '',
            ean: item.ean || 'NO_EAN',
            exact_weight: item.exact_weight || item.weight || 'UNKNOWN',
            stock: item.stock || false,
            url: item.url || item.product_url || '',
            sku: item.sku || '',
            skuRef: item.skuRef || '',
            storeBase: item.storeBase || '',
            site: item.site || '',
            relevance: item.relevance || 0,
            imageUrl: resolveImageUrl(item),
            addToCartLink: addToCartLink || undefined, // Asegurar que se asigne correctamente
          };
          
          // Log para verificar que addToCartLink se mapeó correctamente
          console.log('🔍 Mapped individual product:', {
            canonname: mappedProduct.canonname,
            supermercado: mappedProduct.supermercado,
            hasAddToCartLink: !!mappedProduct.addToCartLink,
            addToCartLink: mappedProduct.addToCartLink,
            url: mappedProduct.url
          });
          
          // Verificación final
          if (!mappedProduct.addToCartLink) {
            console.error('❌ ERROR: addToCartLink is still undefined after mapping for individual product:', mappedProduct.canonname);
            console.error('❌ Item keys:', Object.keys(item));
          }
          
          return mappedProduct;
        });
        
        console.log('🔍 Converted products:', products.length);
        
        // Group products by EAN and weight (TODOS los productos deben agruparse)
        // Pasar el término de búsqueda para filtrar productos irrelevantes
        groupedProducts = productGroupingService.groupProductsByEanAndWeight(products, searchQuery);
        console.log('🔍 Grouped products:', groupedProducts.length);
        
        setProducts(products);
      }
    }
    
    // Sort by relevance
    console.log('🔍 Before sorting: groupedProducts.length =', groupedProducts.length);
    const sortedGroups = productGroupingService.sortGroups(groupedProducts, searchQuery);
    console.log('🔍 After sorting: sortedGroups.length =', sortedGroups.length);
    // ⭐ LOG CRÍTICO: Verificar que no se perdieron productos al ordenar
    if (sortedGroups.length !== groupedProducts.length) {
      console.error(`❌ ERROR: Lost products during sorting! Had ${groupedProducts.length} but now have ${sortedGroups.length}`);
    } else {
      console.log(`✅ All ${groupedProducts.length} products preserved after sorting`);
    }
    
    if (isScraped) {
      console.log('🔍 Setting scrapedProducts:', sortedGroups.length, 'products');
      setScrapedProducts(sortedGroups);
    } else {
      console.log('🔍 Setting groupedProducts:', sortedGroups.length, 'products');
      setGroupedProducts(sortedGroups);
      // ⭐ LOG: Verificar que se establecieron correctamente
      console.log('🔍 groupedProducts state will be updated with', sortedGroups.length, 'products');
    }
  };

  // Función para guardar productos scrapeados en BD
  const handleSaveScrapedProducts = async () => {
    if (!needsDbSave || scrapedProducts.length === 0) return;
    
    try {
      setIsLoading(true);
      console.log('💾 Guardando productos scrapeados en BD...');
      
      // Convertir productos agrupados a formato de SearchResult
      const productsToSave = scrapedProducts.flatMap(group => 
        group.products.map(product => ({
          canonid: product.canonid,
          canonname: product.canonname,
          min_price: product.precio.toString(),
          max_price: product.precio.toString(),
          total_supermarkets: '1',
          last_updated: new Date().toISOString(),
          supermarkets: [{
            super: product.supermercado,
            precio: product.precio,
            stock: product.stock,
            url: product.url,
            capture: ''
          }],
          brand: product.brand,
          brandId: product.brandId
        }))
      );
      
      const success = await searchService.saveScrapedProductsToDatabase(productsToSave);
      
      if (success) {
        Alert.alert(
          'Éxito', 
          `${scrapedProducts.length} productos guardados exitosamente en la base de datos.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setNeedsDbSave(false);
                setShowSaveButton(false);
                // Mover productos scrapeados a la lista principal
                setGroupedProducts([...groupedProducts, ...scrapedProducts]);
                setScrapedProducts([]);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudieron guardar los productos en la base de datos.');
      }
    } catch (error) {
      console.error('Error saving scraped products:', error);
      Alert.alert('Error', 'Ocurrió un error al guardar los productos.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderProduct = ({ item, index }: { item: GroupedProduct; index: number }) => {
    // Usar GroupedProductCard para todos los productos (incluyendo scrapeados)
    return (
      <GroupedProductCard
        group={item}
        onPress={() => navigation.navigate('ProductDetails', { 
          productId: item.ean, 
          productName: item.display_name,
          groupedProduct: item
        })}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Connection Status Indicator */}
      <View style={styles.connectionStatus}>
        <View style={styles.statusLeft}>
          <View style={[
            styles.statusIndicator, 
            { backgroundColor: connectionStatus === 'connected' ? '#4CAF50' : connectionStatus === 'disconnected' ? '#F44336' : '#FF9800' }
          ]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' ? 'Conectado a n8n' : 
             connectionStatus === 'disconnected' ? 'Sin conexión' : 'Verificando...'}
          </Text>
        </View>
        {connectionStatus === 'disconnected' && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setConnectionStatus('checking');
              // Retry connection
              setTimeout(async () => {
                try {
                  const isConnected = await n8nMcpService.testConnection();
                  setConnectionStatus(isConnected ? 'connected' : 'disconnected');
                } catch (error) {
                  setConnectionStatus('disconnected');
                }
              }, 100);
            }}
          >
            <Ionicons name="refresh" size={16} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for products..."
            value={searchQuery}
            onChangeText={handleSearchQueryChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            onFocus={() => {
              // Si hay datos prefetched y el usuario hace focus, limpiar el input para nueva búsqueda
              if (hasPrefetchedData && searchQuery) {
                setSearchQuery('');
                setHasPrefetchedData(false);
                setGroupedProducts([]);
                setFilteredGroups([]);
              }
            }}
          />
        </View>
        <View style={styles.searchActions}>
          <TouchableOpacity 
            style={styles.filtersButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={20} color="#007AFF" />
            <Text style={styles.filtersButtonText}>Filtros</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.searchButton, (isLoading || isSearching || isScraping) && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={isLoading || isSearching || isScraping || connectionStatus === 'disconnected'}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>
                {isSearching ? 'Buscando...' : 
                 isScraping ? 'Scrapeando...' : 'Buscar'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Indicador de progreso mejorado */}
        <ProgressIndicator
          isScraping={isScraping}
          elapsedTime={elapsedTime}
          productCount={groupedProducts.length + scrapedProducts.length}
          isProgressiveLoading={isProgressiveLoading}
        />
        
        {/* Skeleton loading mientras carga */}
        {isLoading && !isProgressiveLoading && groupedProducts.length === 0 && (
          <ProductSkeleton count={3} />
        )}
        
        {/* Botón para guardar productos scrapeados */}
        {showSaveButton && needsDbSave && scrapedProducts.length > 0 && (
          <View style={styles.saveSection}>
            <View style={styles.saveInfo}>
              <Ionicons name="information-circle" size={20} color="#FF9800" />
              <Text style={styles.saveInfoText}>
                {scrapedProducts.length} productos scrapeados listos para guardar
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveScrapedProducts}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Guardar en BD</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={[...filteredGroups, ...scrapedProducts]}
        renderItem={renderProduct}
        keyExtractor={(item, index) => `${item.ean}-${item.exact_weight}-${index}`}
        style={styles.productsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
            title="Actualizar resultados"
            titleColor="#007AFF"
          />
        }
        ListEmptyComponent={
          showEmptyState ? (
            <View style={styles.emptyState}>
              <Ionicons name="search" size="48" color="#ccc" />
              <Text style={styles.emptyStateText}>
                {connectionStatus === 'disconnected' 
                  ? 'Sin conexi??n a n8n. Verifica tu configuraci??n.'
                  : searchQuery 
                    ? filteredGroups.length === 0 && groupedProducts.length > 0
                      ? 'No hay productos que coincidan con los filtros'
                      : 'No se encontraron productos'
                    : 'Busca productos para ver resultados'
                }
              </Text>
            </View>
          ) : null
        }
      />

      <SearchFilters
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleFiltersApply}
        currentFilters={filters}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  retryButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#E3F2FD',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    minHeight: 52,
  },
  filtersButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flex: 1,
  },
  searchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  productsList: {
    flex: 1,
    padding: 20,
  },
  productCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productMarket: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  // Estilos para el flujo de scraping en tiempo real
  scrapingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  scrapingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scrapingText: {
    fontSize: 14,
    color: '#E65100',
    marginLeft: 8,
    fontWeight: '500',
  },
  scrapingSubtext: {
    fontSize: 12,
    color: '#BF360C',
    marginLeft: 24,
    fontStyle: 'italic',
  },
  scrapingProgress: {
    fontSize: 13,
    color: '#FF6F00',
    marginLeft: 24,
    marginTop: 4,
    fontWeight: '600',
  },
  saveSection: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  saveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  saveInfoText: {
    fontSize: 14,
    color: '#2E7D32',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SearchScreen;


