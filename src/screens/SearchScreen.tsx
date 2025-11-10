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

  React.useEffect(() => {
    if (route?.params?.initialQuery) {
      setSearchQuery(route.params.initialQuery);
    }
  }, [route?.params?.initialQuery]);

  React.useEffect(() => {
    const prefetched = route?.params?.prefetchedGroups;
    if (prefetched && Array.isArray(prefetched) && prefetched.length > 0) {
      setGroupedProducts(prefetched);
      setFilteredGroups(prefetched);
      setProducts([]);
      setScrapedProducts([]);
      setIsLoading(false);
      navigation.setParams({ prefetchedGroups: undefined });
    }
  }, [route?.params?.prefetchedGroups, navigation]);

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
    
    // Prevenir múltiples búsquedas simultáneas
    if (isSearching || isScraping || isPolling) {
      console.log('🔍 Search already in progress, ignoring request');
      return;
    }
    
    // Validación adicional: solo permitir búsquedas manuales
    console.log('✅ User-initiated search approved, proceeding...');
    
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
    
    try {
      console.log('🔍 Using new realtime scraping flow');
      
      // Primero intentar búsqueda normal
      const initialResponse = await searchService.searchProductsWithRealtimeScraping(searchQuery, dataSaverMode, dbOnlyMode);
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
        if (productsData && typeof productsData === 'object' && !Array.isArray(productsData) && productsData.data && Array.isArray(productsData.data)) {
          console.log('🔍 Extracting nested data array:', productsData.data.length, 'products');
          productsData = productsData.data;
        } else if (Array.isArray(productsData) && productsData.length === 1 && productsData[0] && typeof productsData[0] === 'object' && productsData[0].data && Array.isArray(productsData[0].data)) {
          console.log('🔍 Extracting nested data from single-item array:', productsData[0].data.length, 'products');
          productsData = productsData[0].data;
        } else if (Array.isArray(productsData)) {
          console.log('🔍 Data is already an array:', productsData.length, 'products');
        } else {
          console.log('🔍 No nested structure found, using data as-is');
        }
        
        console.log('🔍 Final productsData to process:', typeof productsData, Array.isArray(productsData) ? productsData.length : 'not array');
        
        await processSearchResults(productsData, false);
        
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
          searchQuery,
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

  // Función auxiliar para procesar resultados de búsqueda
  const processSearchResults = async (productsArray: any[], isScraped: boolean) => {
    console.log('🔍 Processing search results:', productsArray.length, 'isScraped:', isScraped);
    
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
        groupedProducts = productsArray.map((item: any) => {
          const groupImage = resolveImageUrl(item);
          const mappedProducts: Product[] = item.supermarkets.map((supermarket: any) => {
            const productImage = resolveImageUrl(supermarket) || groupImage;
            return {
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
            };
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
        
        // Aplicar filtrado de relevancia a productos ya agrupados de BD
        if (searchQuery && searchQuery.trim().length >= 2) {
          const filteredGroups = groupedProducts.filter(group => {
            const relevance = productGroupingService.calculateGroupRelevance(group, searchQuery);
            const isRelevant = relevance >= 25; // Mismo umbral que en filterRelevantProducts
            
            if (!isRelevant) {
              console.log(`❌ Filtered out group: "${group.display_name}" (relevance: ${relevance.toFixed(1)})`);
            }
            
            return isRelevant;
          });
          
          console.log(`🔍 Filtered grouped products from ${groupedProducts.length} to ${filteredGroups.length}`);
          groupedProducts = filteredGroups;
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
          console.log('🔍 Mapping product item:', item);
          
          return {
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
          };
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
    const sortedGroups = productGroupingService.sortGroups(groupedProducts, searchQuery);
    console.log('🔍 Sorted groups:', sortedGroups.length);
    
    if (isScraped) {
      setScrapedProducts(sortedGroups);
    } else {
      setGroupedProducts(sortedGroups);
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
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
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


