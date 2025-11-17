import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated, Modal, ScrollView, Linking, Alert, AppState } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { GroupedProduct, Product, productGroupingService } from '../services/productGroupingService';
import PopularProductCard from './PopularProductCard';
import { n8nMcpService } from '../services/n8nMcpService';
import { ProductHeader } from './ProductCard/ProductHeader';
import { formatPrice } from '../utils/productNameUtils';
import { cartService } from '../services/cartService';

interface PopularProductsProps {
  onProductSelect?: (query: string) => void;
}

const POPULAR_PRODUCTS_PATH = '/webhook/popular_products';
const REFRESH_INTERVAL = 30 * 60 * 1000;
const CAROUSEL_ITEM_WIDTH = 220;
const AUTO_SCROLL_SPEED = 45;

const getPopularProductsEndpoint = (): string => {
  const baseUrl = n8nMcpService.getConfig().baseUrl;
  return `${baseUrl}${POPULAR_PRODUCTS_PATH}`;
};

const normalizeSupermarket = (
  raw: any,
  fallback: { canonid: string; canonname: string; ean: string; exact_weight: string; brand?: string; brandId?: string; imageUrl?: string; }
): Product | null => {
  if (!raw || typeof raw !== 'object') return null;

  // Convertir precio de string a número si es necesario
  const priceRaw = raw.precio ?? raw.price ?? raw.min_price ?? raw.max_price ?? raw.best_price;
  const price = typeof priceRaw === 'string' ? parseFloat(priceRaw) : Number(priceRaw);
  if (Number.isNaN(price) || price <= 0) return null;

  const supermarketName = raw.supermercado ?? raw.super ?? raw.store ?? raw.market ?? raw.name;
  if (!supermarketName) return null;

  // Buscar imagen en múltiples formatos (incluyendo imageurl en minúsculas)
  const resolvedImage = raw.imageUrl ?? raw.imageurl ?? raw.imgUrl ?? raw.image_url ?? raw.image ?? fallback.imageUrl;

  return {
    canonid: String(raw.canonid ?? fallback.canonid),
    canonname: String(raw.canonname ?? fallback.canonname),
    precio: price,
    supermercado: String(supermarketName),
    ean: String(raw.ean ?? fallback.ean),
    exact_weight: String(raw.exact_weight ?? fallback.exact_weight ?? ''),
    stock: Boolean(raw.stock ?? raw.in_stock ?? true),
    url: String(raw.url ?? ''),
    imageUrl: resolvedImage ? String(resolvedImage) : undefined,
    brand: raw.brand ?? fallback.brand,
    brandId: raw.brandId ?? fallback.brandId,
    sku: raw.sku,
    skuRef: raw.skuRef,
    storeBase: raw.storeBase,
    site: raw.site,
    relevance: raw.relevance,
    addToCartLink: raw.addToCartLink ?? raw.add_to_cart_link ?? raw.addToCart ?? undefined,
  };
};

const collectProductEntries = (node: any, context: { meta?: any; query?: string } = {}): Array<{ product: any; context: { meta?: any; query?: string } }> => {
  if (!node) return [];

  if (Array.isArray(node)) {
    console.log(`🔍 [collectProductEntries] Processing array with ${node.length} items`);
    const results = node.flatMap((item, index) => {
      if (!item || typeof item !== 'object') {
        console.log(`  ⚠️ Item ${index} is not a valid object`);
        return [];
      }
      
      // ⭐ NUEVO: Manejar formato n8n { json: { status: 'success', data: [...] } }
      if (item.json && typeof item.json === 'object') {
        const jsonData = item.json;
        
        // Si tiene un array 'data' con productos, extraerlos
        if (jsonData.status && Array.isArray(jsonData.data) && jsonData.data.length > 0) {
          console.log(`  ✅ Item ${index}: Found { json: { status, data: [...] } } with ${jsonData.data.length} products`);
          return jsonData.data.map((product: any) => ({
            product: product,
            context: context
          }));
        }
        
        // Si el json tiene estructura de producto directamente (canonid, canonname, supermarkets)
        if (jsonData.canonid || jsonData.canonname || Array.isArray(jsonData.supermarkets)) {
          console.log(`  ✅ Item ${index}: Found product in json: "${jsonData.canonname || jsonData.canonid}"`);
          return [{ product: jsonData, context }];
        }
        
        // Si no, intentar extraer recursivamente
        return collectProductEntries(jsonData, context);
      }
      
      // Si el item tiene estructura de producto (canonid, canonname, supermarkets), retornarlo directamente
      if (item.canonid || item.canonname || Array.isArray(item.supermarkets)) {
        console.log(`  ✅ Item ${index}: Found direct product: "${item.canonname || item.canonid}"`);
        return [{ product: item, context }];
      }
      return collectProductEntries(item, context);
    });
    console.log(`🔍 [collectProductEntries] Returning ${results.length} products from array`);
    return results;
  }

  if (Array.isArray(node.items)) {
    return node.items.flatMap((item: any) => {
      const itemContext = { meta: item?.meta ?? context.meta, query: item?.query ?? context.query };
      if (Array.isArray(item?.products)) {
        return item.products.flatMap((product: any) => collectProductEntries(product, itemContext));
      }
      return collectProductEntries(item, itemContext);
    });
  }

  // ⭐ NUEVO: Manejar formato directo { status: 'success', data: [...] }
  if (node.status && Array.isArray(node.data)) {
    return node.data.map((product: any) => ({
      product: product,
      context: context
    }));
  }

  // ⭐ NUEVO: Si el nodo es directamente un producto (tiene canonid/canonname pero no es array)
  // Esto puede pasar si n8n retorna solo el primer item en lugar del array completo
  if (node.canonid || node.canonname || Array.isArray(node.supermarkets)) {
    // Si tiene estructura de producto, retornarlo como único producto
    // PERO esto es un problema - deberíamos recibir múltiples productos
    console.warn('⚠️ [PopularProducts] Received single product object instead of array. This may indicate n8n is only returning the first item.');
    return [{ product: node, context }];
  }

  if (Array.isArray(node.data)) {
    return collectProductEntries(node.data, context);
  }

  if (Array.isArray(node.results)) {
    return collectProductEntries(node.results, context);
  }

  if (Array.isArray(node.popular_products)) {
    return collectProductEntries(node.popular_products, context);
  }

  if (Array.isArray(node.products) && !Array.isArray(node.supermarkets)) {
    const nextContext = { meta: node.meta ?? context.meta, query: node.query ?? context.query };
    return collectProductEntries(node.products, nextContext);
  }

  if (Array.isArray(node.supermarkets)) {
    return [{ product: node, context }];
  }

  return [];
};

const normalizePopularProducts = (payload: any): GroupedProduct[] => {
  const entries = collectProductEntries(payload);

  return entries
    .map(({ product, context }, index) => {
      if (!product || typeof product !== 'object') return null;

      const meta = { ...(context.meta || {}), ...(product.meta || {}) };
      const displayName = product.canonname ?? meta.canonname ?? product.name ?? meta.product_name ?? context.query;
      if (!displayName) return null;

      const canonid = String(product.canonid ?? meta.canonid ?? displayName);
      const ean = String(product.ean ?? meta.ean ?? canonid);
      const exactWeight = String(product.exact_weight ?? meta.exact_weight ?? '');

      // Buscar imagen en múltiples ubicaciones (incluyendo imageurl en minúsculas)
      const imageCandidates = [
        product.imageUrl,
        product.imageurl,  // ← Agregado para el nuevo formato
        product.imgUrl,
        product.image_url,
        product.image,
        meta.imageUrl,
        meta.imageurl,  // ← Agregado para el nuevo formato
        meta.imgUrl,
        meta.image_url,
        meta.image,
      ];
      const productImageCandidate = imageCandidates.find(value => typeof value === 'string' && value.trim().length > 0) ?? imageCandidates.find(Boolean);
      const productImage = productImageCandidate ? String(productImageCandidate) : undefined;

      const rawSupermarkets = Array.isArray(product.supermarkets) ? product.supermarkets : [];
      const mappedProducts = rawSupermarkets
        .map(raw => {
          // Normalizar el objeto supermarket y agregar addToCartLink si está disponible
          const normalized = normalizeSupermarket(raw, {
            canonid,
            canonname: displayName,
            ean,
            exact_weight: exactWeight,
            brand: product.brand ?? meta.brand,
            brandId: product.brandId ?? meta.brandId,
            imageUrl: productImage,
          });
          
          // Agregar addToCartLink desde el objeto supermarket si existe
          if (normalized && raw.addToCartLink) {
            normalized.addToCartLink = raw.addToCartLink;
          }
          
          return normalized;
        })
        .filter(Boolean) as Product[];

      if (mappedProducts.length === 0) return null;

      const prices = mappedProducts.map(item => item.precio);
      
      // Convertir precios de string a número si es necesario
      const minPriceRaw = product.min_price ?? meta.min_price ?? Math.min(...prices);
      const maxPriceRaw = product.max_price ?? meta.max_price ?? Math.max(...prices);
      const minPrice = typeof minPriceRaw === 'string' ? parseFloat(minPriceRaw) : Number(minPriceRaw);
      const maxPrice = typeof maxPriceRaw === 'string' ? parseFloat(maxPriceRaw) : Number(maxPriceRaw);

      const bestPriceCandidate =
        product.best_price && typeof product.best_price === 'object'
          ? normalizeSupermarket(product.best_price, {
              canonid,
              canonname: displayName,
              ean,
              exact_weight: exactWeight,
              brand: product.brand ?? meta.brand,
              brandId: product.brandId ?? meta.brandId,
              imageUrl: productImage,
            })
          : null;

      const bestPrice = bestPriceCandidate ?? mappedProducts.reduce((currentBest, candidate) => (candidate.precio < currentBest.precio ? candidate : currentBest), mappedProducts[0]);

      const alternativeNames = [
        ...(Array.isArray(meta.alternative_names) ? meta.alternative_names : []),
        ...(Array.isArray(product.alternative_names) ? product.alternative_names : []),
      ]
        .map(String)
        .filter(Boolean);

      // Calcular total_supermarkets SIEMPRE desde el array mappedProducts
      // Esto asegura consistencia con lo que se muestra en la card
      const totalSupermarkets = mappedProducts.length;

      return {
        ean,
        exact_weight: exactWeight,
        brand: product.brand ?? meta.brand,
        brandId: product.brandId ?? meta.brandId,
        products: mappedProducts,
        min_price: minPrice,
        max_price: maxPrice,
        total_supermarkets: totalSupermarkets,
        alternative_names: Array.from(new Set(alternativeNames)),
        display_name: String(displayName),
        has_stock: mappedProducts.some(item => item.stock),
        imageUrl: productImage ?? bestPrice?.imageUrl ?? mappedProducts[0]?.imageUrl,
        best_price: bestPrice,
      } satisfies GroupedProduct;
    })
    .filter((item): item is GroupedProduct => Boolean(item));
};

const PopularProducts: React.FC<PopularProductsProps> = ({ onProductSelect }) => {
  const [popularProducts, setPopularProducts] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const carouselRef = useRef<Animated.FlatList<GroupedProduct>>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoScrollOffsetRef = useRef(0);
  const [selectedProduct, setSelectedProduct] = useState<GroupedProduct | null>(null);
  const [addingSupermarket, setAddingSupermarket] = useState<string | null>(null);
  const [supermarketQuantities, setSupermarketQuantities] = useState<Record<string, number>>({});
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!selectedProduct) {
      setSupermarketQuantities({});
      return;
    }

    const next: Record<string, number> = {};
    selectedProduct.products.forEach((product, index) => {
      const key = `${selectedProduct.ean}-${product.supermercado}-${index}`;
      next[key] = supermarketQuantities[key] ?? 1;
    });
    setSupermarketQuantities(next);
  }, [selectedProduct]);

  const loadPopularProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getPopularProductsEndpoint();
      console.log('🌐 [PopularProducts] Fetching from:', endpoint);
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      console.log('📦 [PopularProducts] Raw API response type:', typeof payload, Array.isArray(payload) ? 'array' : 'object');
      console.log('📦 [PopularProducts] Payload length/keys:', Array.isArray(payload) ? payload.length : (payload ? Object.keys(payload) : 'null'));
      
      // ⭐ CASO 1: Array de productos directamente [{ json: product1 }, { json: product2 }, ...]
      if (Array.isArray(payload) && payload.length > 0) {
        console.log('📦 [PopularProducts] Detected array format, length:', payload.length);
        
        // Verificar si es array de items n8n con { json: ... }
        const firstItem = payload[0];
        if (firstItem.json && typeof firstItem.json === 'object') {
          const jsonData = firstItem.json;
          
          // Si el primer item tiene { json: { status, data: [...] } }
          if (jsonData.status && Array.isArray(jsonData.data)) {
            console.log('📦 [PopularProducts] Detected n8n format: [{ json: { status, data: [...] } }]');
            console.log('📦 [PopularProducts] Products in data array:', jsonData.data.length);
            if (jsonData.data.length > 0) {
              console.log('📦 [PopularProducts] First product in data:', {
                canonname: jsonData.data[0].canonname,
                total_supermarkets: jsonData.data[0].total_supermarkets,
                supermarkets_count: jsonData.data[0].supermarkets?.length
              });
            }
          } 
          // Si el primer item tiene { json: product } (producto directo)
          else if (jsonData.canonid || jsonData.canonname || Array.isArray(jsonData.supermarkets)) {
            console.log('📦 [PopularProducts] Detected n8n format: [{ json: product1 }, { json: product2 }, ...]');
            console.log('📦 [PopularProducts] Total items in array:', payload.length);
            console.log('📦 [PopularProducts] First product:', {
              canonname: jsonData.canonname,
              total_supermarkets: jsonData.total_supermarkets,
              supermarkets_count: jsonData.supermarkets?.length
            });
            if (payload.length > 1) {
              console.log('📦 [PopularProducts] Second product:', {
                canonname: payload[1].json?.canonname || 'N/A',
                total_supermarkets: payload[1].json?.total_supermarkets || 'N/A'
              });
            }
          } else {
            console.log('📦 [PopularProducts] First item structure:', JSON.stringify(firstItem, null, 2).substring(0, 500));
          }
        }
        // Si es array de productos directamente (sin wrapper json)
        else if (firstItem.canonid || firstItem.canonname || Array.isArray(firstItem.supermarkets)) {
          console.log('📦 [PopularProducts] Detected direct array format: [product1, product2, ...]');
          console.log('📦 [PopularProducts] Total products in array:', payload.length);
          console.log('📦 [PopularProducts] First product:', {
            canonname: firstItem.canonname,
            total_supermarkets: firstItem.total_supermarkets,
            supermarkets_count: firstItem.supermarkets?.length
          });
        } else {
          console.log('📦 [PopularProducts] Unknown array format, first item:', JSON.stringify(firstItem, null, 2).substring(0, 500));
        }
      } 
      // ⭐ CASO 2: Objeto único
      else if (payload && typeof payload === 'object') {
        // Detectar formato directo { status: 'success', data: [...] }
        if (payload.status && Array.isArray(payload.data)) {
          console.log('📦 [PopularProducts] Detected direct format: { status, data: [...] }');
          console.log('📦 [PopularProducts] Products in data array:', payload.data.length);
          if (payload.data.length > 0) {
            console.log('📦 [PopularProducts] First product in data:', {
              canonname: payload.data[0].canonname,
              total_supermarkets: payload.data[0].total_supermarkets,
              supermarkets_count: payload.data[0].supermarkets?.length
            });
          }
        }
        // Si es un producto individual directamente
        else if (payload.canonid || payload.canonname || Array.isArray(payload.supermarkets)) {
          console.warn('⚠️ [PopularProducts] Received single product object. Expected array of products.');
          console.log('📦 [PopularProducts] Single product:', {
            canonname: payload.canonname,
            total_supermarkets: payload.total_supermarkets,
            supermarkets_count: payload.supermarkets?.length
          });
        } else {
          console.log('📦 [PopularProducts] Payload structure:', JSON.stringify(payload, null, 2).substring(0, 1000));
        }
      }
      
      const normalized = normalizePopularProducts(payload);
      console.log('✅ [PopularProducts] Normalized products count:', normalized.length);
      
      if (normalized.length > 0) {
        console.log('✅ [PopularProducts] First normalized product:', {
          display_name: normalized[0].display_name,
          imageUrl: normalized[0].imageUrl,
          best_price_imageUrl: normalized[0].best_price?.imageUrl,
          products_with_images: normalized[0].products.filter(pr => pr.imageUrl).length,
          all_product_images: normalized[0].products.map(p => ({ super: p.supermercado, imageUrl: p.imageUrl })),
        });
        
        // 🔍 DEBUG: Verificar cantidad de supermercados
        console.log('🔍 [DEBUG] Supermarket count validation:');
        normalized.slice(0, 3).forEach((product, idx) => {
          console.log(`  Product ${idx + 1}: "${product.display_name}"`);
          console.log(`    - total_supermarkets (field): ${product.total_supermarkets}`);
          console.log(`    - products.length (actual): ${product.products.length}`);
          console.log(`    - Match: ${product.total_supermarkets === product.products.length ? '✅' : '❌'}`);
          console.log(`    - Supermarkets: ${product.products.map(p => p.supermercado).join(', ')}`);
        });
      }
      
      if (normalized.length === 0) {
        throw new Error('No products found in response');
      }
      
      setPopularProducts(normalized);
      setError(null); // Clear error if we have products
      autoScrollOffsetRef.current = 0;
      carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollX.setValue(0);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[PopularProducts] Failed to fetch popular products:', err);
      setError('No pudimos cargar los productos populares. Intenta nuevamente más tarde.');
      // Don't clear products if we have them from a previous load
      if (popularProducts.length === 0) {
        setPopularProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [scrollX, popularProducts.length]);

  useEffect(() => {
    loadPopularProducts();
    const interval = setInterval(loadPopularProducts, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadPopularProducts]);

  const carouselData = useMemo(() => {
    if (popularProducts.length > 1) {
      return [...popularProducts, ...popularProducts];
    }
    return popularProducts;
  }, [popularProducts]);

  // Función para iniciar/reiniciar la animación del carrusel
  const startCarouselAnimation = useCallback(() => {
    // Limpiar animación anterior si existe
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (carouselData.length <= 1) {
      autoScrollOffsetRef.current = 0;
      return;
    }

    const totalWidth = carouselData.length * CAROUSEL_ITEM_WIDTH;
    let lastTimestamp = Date.now();

    const step = () => {
      const now = Date.now();
      const deltaSeconds = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      autoScrollOffsetRef.current = (autoScrollOffsetRef.current + AUTO_SCROLL_SPEED * deltaSeconds) % totalWidth;

      carouselRef.current?.scrollToOffset({ offset: autoScrollOffsetRef.current, animated: false });
      scrollX.setValue(autoScrollOffsetRef.current);

      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [carouselData.length, scrollX]);

  // Efecto para iniciar la animación cuando cambian los datos
  useEffect(() => {
    if (isFocused) {
      startCarouselAnimation();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [carouselData.length, scrollX, startCarouselAnimation, isFocused]);

  // Efecto para reiniciar la animación cuando la pantalla vuelve a estar enfocada
  useEffect(() => {
    if (isFocused && carouselData.length > 1) {
      // Reiniciar la animación cuando la pantalla vuelve a estar enfocada
      startCarouselAnimation();
    }
  }, [isFocused, carouselData.length, startCarouselAnimation]);

  const handleSelectProduct = (product: GroupedProduct) => {
    setSelectedProduct(product);
  };

  const closeModal = () => setSelectedProduct(null);

  const handleOpenInSearch = () => {
    if (!selectedProduct || !onProductSelect) {
      return;
    }

    const searchQuery =
      selectedProduct.display_name || selectedProduct.canonname || '';
    if (!searchQuery) {
      return;
    }

    onProductSelect(searchQuery);
    setSelectedProduct(null);
  };

  const handleQuantityChange = (key: string, delta: number) => {
    setSupermarketQuantities(prev => {
      const current = prev[key] ?? 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const handleAddProductToCart = async (product: Product, key: string) => {
    if (!product.addToCartLink) {
      Alert.alert(
        'Sin enlace',
        'Este supermercado no tiene un enlace directo para agregar al carrito.'
      );
      return;
    }

    try {
      setAddingSupermarket(key);
      const quantity = supermarketQuantities[key] ?? 1;
      await cartService.addToCart(product, quantity);
      Alert.alert(
        'Agregado al carrito',
        `${product.canonname || product.canonid || 'Producto'} (${product.supermercado}) agregado al carrito.`
      );
    } catch (error) {
      console.error('Error adding product to cart:', error);
      Alert.alert('Error', 'No se pudo agregar el producto al carrito.');
    } finally {
      setAddingSupermarket(null);
    }
  };

  const getLastUpdateText = (): string => {
    if (!lastUpdate) return '';
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return 'Actualizado hace segundos';
    if (diffMinutes === 1) return 'Actualizado hace 1 minuto';
    if (diffMinutes < 60) return `Actualizado hace ${diffMinutes} minutos`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'Actualizado hace 1 hora';
    if (diffHours < 24) return `Actualizado hace ${diffHours} horas`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? 'Actualizado hace 1 día' : `Actualizado hace ${diffDays} días`;
  };

  const renderProduct = ({ item, index }: { item: GroupedProduct; index: number }) => {
    const inputRange = [
      (index - 1) * CAROUSEL_ITEM_WIDTH,
      index * CAROUSEL_ITEM_WIDTH,
      (index + 1) * CAROUSEL_ITEM_WIDTH,
    ];

    const scale = scrollX.interpolate({ inputRange, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.65, 1, 0.65], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.carouselItem, { transform: [{ scale }], opacity }]}
        key={`${item.ean}-${index}`}>
        <PopularProductCard product={item} onPress={handleSelectProduct} onAdd={handleSelectProduct} />
      </Animated.View>
    );
  };

  const listEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Sin productos populares</Text>
        <Text style={styles.emptyStateSubtitle}>Todavía no hay resultados disponibles desde n8n.</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="flame-outline" size={20} color="#FF6B6B" />
          <Text style={styles.title}>Productos Populares</Text>
        </View>
        <TouchableOpacity onPress={loadPopularProducts} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={20} color="#007bff" />
        </TouchableOpacity>
      </View>

      {lastUpdate && <Text style={styles.lastUpdateText}>{getLastUpdateText()}</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007bff" />
          <Text style={styles.loadingText}>Cargando productos populares...</Text>
        </View>
      )}

      <Animated.FlatList
        ref={carouselRef}
        data={carouselData}
        renderItem={renderProduct}
        keyExtractor={(_, index) => `popular-${index}`}
        horizontal
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        snapToInterval={CAROUSEL_ITEM_WIDTH}
        decelerationRate="fast"
        ListEmptyComponent={listEmptyComponent}
      />

      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del producto</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={20} color="#1f2937" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <ScrollView style={styles.modalScroll}>
                <ProductHeader group={selectedProduct} />

                <View style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <Text style={styles.sectionLabel}>
                    Precios por supermercado ({selectedProduct.products.length})
                  </Text>
                  {selectedProduct.products.map((productItem, index) => {
                    const name = productItem.supermercado
                      ? productItem.supermercado.replace(/\b\w/g, (c: string) => c.toUpperCase())
                      : 'Sin nombre';
                    const rowKey = `${selectedProduct.ean}-${productItem.supermercado}-${index}`;
                    const isAdding = addingSupermarket === rowKey;
                    const canAdd = !!productItem.addToCartLink;
                    const quantity = supermarketQuantities[rowKey] ?? 1;

                    const openLink = async () => {
                      if (!productItem.url) {
                        Alert.alert('Aviso', 'No hay enlace disponible para este producto.');
                        return;
                      }

                      try {
                        const supported = await Linking.canOpenURL(productItem.url);
                        if (supported) {
                          await Linking.openURL(productItem.url);
                        } else {
                          Alert.alert('Aviso', 'No se puede abrir este enlace');
                        }
                      } catch (error) {
                        console.error('Error abriendo enlace:', error);
                        Alert.alert('Aviso', 'Error al abrir el enlace');
                      }
                    };

                    return (
                      <View key={`${productItem.supermercado}_${index}`} style={styles.supermarketRow}>
                        <View style={styles.supermarketInfo}>
                          <Text style={styles.supermarketRowName}>{name}</Text>
                          <Text style={styles.supermarketRowPrice}>{formatPrice(productItem.precio)}</Text>
                        </View>
                        <View style={styles.supermarketActions}>
                          <View style={styles.stockRow}>
                            <Text
                              style={[
                                styles.supermarketRowStock,
                                { color: productItem.stock ? '#10B981' : '#EF4444' },
                              ]}
                            >
                              {productItem.stock ? 'En stock' : 'Sin stock'}
                            </Text>
                            <View style={styles.quantityControls}>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => handleQuantityChange(rowKey, -1)}
                              >
                                <Ionicons name="remove" size={16} color="#007bff" />
                              </TouchableOpacity>
                              <Text style={styles.quantityText}>{quantity}</Text>
                              <TouchableOpacity
                                style={styles.quantityButton}
                                onPress={() => handleQuantityChange(rowKey, 1)}
                              >
                                <Ionicons name="add" size={16} color="#007bff" />
                              </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.addButton,
                                (!canAdd || isAdding) && styles.addButtonDisabled,
                              ]}
                              onPress={() => handleAddProductToCart(productItem, rowKey)}
                              disabled={!canAdd || isAdding}
                            >
                              {isAdding ? (
                                <ActivityIndicator size="small" color="#007bff" />
                              ) : (
                                <Ionicons name="cart-outline" size={18} color="#007bff" />
                              )}
                            </TouchableOpacity>
                          </View>
                          {productItem.url ? (
                            <TouchableOpacity style={styles.linkButton} onPress={openLink}>
                              <Text style={styles.linkButtonText}>Ver producto</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {onProductSelect ? (
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={handleOpenInSearch}
                    >
                      <Ionicons name="search-outline" size={16} color="#007bff" />
                      <Text style={styles.secondaryButtonText}>Ver resultados</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  refreshButton: {
    padding: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6c757d',
    paddingHorizontal: 16,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#dc3545',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6c757d',
  },
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  carouselItem: {
    width: CAROUSEL_ITEM_WIDTH,
  },
  emptyState: {
    width: 220,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e6eef7',
    backgroundColor: '#f9fbfd',
    marginRight: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#6c757d',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 6,
  },
  modalScroll: {
    maxHeight: '90%',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 10,
  },
  supermarketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  supermarketRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  supermarketRowPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginTop: 4,
  },
  supermarketRowStock: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e0edff',
  },
  linkButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007bff',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 15,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
  },
  quantityButton: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  quantityText: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F0FF',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
});

export default PopularProducts;







