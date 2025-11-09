import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Modal, ScrollView, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupedProduct, Product, productGroupingService } from '../services/productGroupingService';
import PopularProductCard from './PopularProductCard';
import { n8nMcpService } from '../services/n8nMcpService';
import { ProductHeader } from './ProductCard/ProductHeader';
import { formatPrice } from '../utils/productNameUtils';

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

  const price = Number(raw.precio ?? raw.price ?? raw.min_price ?? raw.max_price ?? raw.best_price);
  if (Number.isNaN(price)) return null;

  const supermarketName = raw.supermercado ?? raw.super ?? raw.store ?? raw.market ?? raw.name;
  if (!supermarketName) return null;

  const resolvedImage = raw.imageUrl ?? raw.imgUrl ?? raw.image_url ?? raw.imageurl ?? raw.image ?? fallback.imageUrl;

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
  };
};

const collectProductEntries = (node: any, context: { meta?: any; query?: string } = {}): Array<{ product: any; context: { meta?: any; query?: string } }> => {
  if (!node) return [];

  if (Array.isArray(node)) {
    return node.flatMap(item => collectProductEntries(item, context));
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
    .map(({ product, context }) => {
      if (!product || typeof product !== 'object') return null;

      const meta = { ...(context.meta || {}), ...(product.meta || {}) };
      const displayName = product.canonname ?? meta.canonname ?? product.name ?? meta.product_name ?? context.query;
      if (!displayName) return null;

      const canonid = String(product.canonid ?? meta.canonid ?? displayName);
      const ean = String(product.ean ?? meta.ean ?? canonid);
      const exactWeight = String(product.exact_weight ?? meta.exact_weight ?? '');

      const imageCandidates = [
        product.imageUrl,
        product.imgUrl,
        product.imageurl,
        product.image_url,
        product.image,
        meta.imageUrl,
        meta.imgUrl,
        meta.imageurl,
        meta.image_url,
        meta.image,
      ];
      const productImageCandidate = imageCandidates.find(value => typeof value === 'string' && value.trim().length > 0) ?? imageCandidates.find(Boolean);
      const productImage = productImageCandidate ? String(productImageCandidate) : undefined;

      const rawSupermarkets = Array.isArray(product.supermarkets) ? product.supermarkets : [];
      const mappedProducts = rawSupermarkets
        .map(raw =>
          normalizeSupermarket(raw, {
            canonid,
            canonname: displayName,
            ean,
            exact_weight: exactWeight,
            brand: product.brand ?? meta.brand,
            brandId: product.brandId ?? meta.brandId,
            imageUrl: productImage,
          }),
        )
        .filter(Boolean) as Product[];

      if (mappedProducts.length === 0) return null;

      const prices = mappedProducts.map(item => item.precio);
      const minPrice = Number(product.min_price ?? meta.min_price ?? Math.min(...prices));
      const maxPrice = Number(product.max_price ?? meta.max_price ?? Math.max(...prices));

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

      return {
        ean,
        exact_weight: exactWeight,
        brand: product.brand ?? meta.brand,
        brandId: product.brandId ?? meta.brandId,
        products: mappedProducts,
        min_price: minPrice,
        max_price: maxPrice,
        total_supermarkets: Number(product.total_supermarkets ?? mappedProducts.length),
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

  const loadPopularProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoint = getPopularProductsEndpoint();
      const response = await fetch(endpoint, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      const normalized = normalizePopularProducts(payload);
      setPopularProducts(normalized);
      autoScrollOffsetRef.current = 0;
      carouselRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollX.setValue(0);
      setLastUpdate(new Date());
    } catch (err) {
      setError('No pudimos cargar los productos populares. Intenta nuevamente más tarde.');
      console.error('[PopularProducts] Failed to fetch popular products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scrollX]);

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

  useEffect(() => {
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

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [carouselData.length, scrollX]);

  const handleSelectProduct = (product: GroupedProduct) => {
    setSelectedProduct(product);
  };

  const closeModal = () => setSelectedProduct(null);

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
                    Precios por supermercado ({selectedProduct.total_supermarkets || selectedProduct.products.length})
                  </Text>
                  {selectedProduct.products.map((productItem, index) => {
                    const name = productItem.supermercado
                      ? productItem.supermercado.replace(/\b\w/g, (c: string) => c.toUpperCase())
                      : 'Sin nombre';

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
                          <Text
                            style={[
                              styles.supermarketRowStock,
                              { color: productItem.stock ? '#10B981' : '#EF4444' },
                            ]}
                          >
                            {productItem.stock ? 'En stock' : 'Sin stock'}
                          </Text>
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

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.secondaryButton}>
                    <Ionicons name="notifications-outline" size={16} color="#007bff" />
                    <Text style={styles.secondaryButtonText}>Crear alerta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton}>
                    <Ionicons name="time-outline" size={16} color="#007bff" />
                    <Text style={styles.secondaryButtonText}>Ver historial</Text>
                  </TouchableOpacity>
                </View>
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
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  secondaryButtonText: {
    color: '#007bff',
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default PopularProducts;







