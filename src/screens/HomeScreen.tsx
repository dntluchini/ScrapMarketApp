import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PopularProducts from '../components/PopularProducts';
import { n8nMcpService } from '../services/n8nMcpService';

interface HomeScreenProps {
  navigation: any;
}

type QuickSearchItem = {
  icon: string;
  label: string;
  query: string;
  color: string;
  iconSet?: 'ion' | 'mci';
};

// Usar la misma base URL que n8nMcpService para mantener consistencia
const getQuickSearchEndpoint = (): string => {
  const baseUrl = n8nMcpService.getConfig().baseUrl;
  return `${baseUrl}/webhook/quick_search`;
};

const QUICK_SEARCH_ITEMS: QuickSearchItem[] = [
  { icon: 'broom', label: 'Limpieza', query: 'limpieza', color: '#0ea5e9', iconSet: 'mci' },
  { icon: 'leaf-outline', label: 'Vegetales', query: 'vegetales', color: '#22c55e', iconSet: 'ion' },
  { icon: 'food-steak', label: 'Carnes', query: 'carnes', color: '#ef4444', iconSet: 'mci' },
  { icon: 'wine-outline', label: 'Bebidas', query: 'bebidas', color: '#f97316', iconSet: 'ion' },
  { icon: 'cow', label: 'L\u00E1cteos', query: 'l\u00E1cteos', color: '#8b5cf6', iconSet: 'mci' },
  { icon: 'baguette', label: 'Panader\u00EDa', query: 'panader\u00EDa', color: '#facc15', iconSet: 'mci' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [quickSearchLoading, setQuickSearchLoading] = useState<string | null>(null);

  const handleProductSelect = (query: string) => {
    navigation.navigate('Search', { initialQuery: query, fromPopularProducts: true });
  };

  const normalizeQuickSearchResponse = (payload: any): any[] => {
    console.log('📦 [HomeScreen] Normalizing quick search response:', typeof payload, Array.isArray(payload) ? 'array' : 'object');
    
    // ⭐ CASO 0: Array directo de productos con supermarkets (formato más común)
    if (Array.isArray(payload) && payload.length > 0) {
      const firstItem = payload[0];
      // Verificar si el primer item tiene supermarkets directamente (sin wrapper json)
      if (firstItem && typeof firstItem === 'object' && !firstItem.json && Array.isArray(firstItem.supermarkets)) {
        console.log('📦 [HomeScreen] Detected direct array format with supermarkets: [product1, product2, ...]');
        return payload.map((product: any) => {
          const supermarkets = Array.isArray(product.supermarkets) ? product.supermarkets : [];
          const mappedSupermarkets = supermarkets.map((market: any) => ({
            canonid: product.canonid || '',
            canonname: product.canonname || product.display_name || 'Producto',
            precio: Number(market.precio ?? market.price ?? 0),
            supermercado: market.supermercado || market.super || market.supermarket || 'supermercado',
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            stock: Boolean(market.stock),
            url: market.url || '',
            imageUrl: market.imageUrl || product.imageUrl,
            brand: product.brand,
            addToCartLink: market.addToCartLink || market.add_to_cart_link,
          }));

          return {
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            brand: product.brand || '',
            products: mappedSupermarkets,
            min_price: Number(product.min_price ?? 0),
            max_price: Number(product.max_price ?? 0),
            total_supermarkets: product.total_supermarkets ?? supermarkets.length,
            alternative_names: Array.isArray(product.alternative_names) ? product.alternative_names : [],
            display_name: product.canonname || product.display_name || 'Producto',
            has_stock: mappedSupermarkets.some(entry => entry.stock),
            best_price: mappedSupermarkets.length > 0
              ? mappedSupermarkets.reduce((best: any, current: any) =>
                  current.precio < best.precio ? current : best
                )
              : undefined,
            imageUrl: product.imageUrl,
          };
        });
      }
    }
    
    // ⭐ CASO 1: Array de productos directamente [{ json: product1 }, { json: product2 }, ...]
    if (Array.isArray(payload) && payload.length > 0) {
      const firstItem = payload[0];
      
      // Si es formato n8n con { json: { status, data: [...] } }
      if (firstItem.json && firstItem.json.status && Array.isArray(firstItem.json.data)) {
        console.log('📦 [HomeScreen] Detected n8n format: [{ json: { status, data: [...] } }]');
        const products = firstItem.json.data;
        return products.map((product: any) => {
          const supermarkets = Array.isArray(product.supermarkets) ? product.supermarkets : [];
          const mappedSupermarkets = supermarkets.map((market: any) => ({
            canonid: product.canonid || '',
            canonname: product.canonname || product.display_name || 'Producto',
            precio: Number(market.precio ?? market.price ?? 0),
            supermercado: market.supermercado || market.super || market.supermarket || 'supermercado',
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            stock: Boolean(market.stock),
            url: market.url || '',
            imageUrl: market.imageUrl || product.imageUrl,
            brand: product.brand,
            addToCartLink: market.addToCartLink || market.add_to_cart_link,
          }));

          return {
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            brand: product.brand || '',
            products: mappedSupermarkets,
            min_price: Number(product.min_price ?? 0),
            max_price: Number(product.max_price ?? 0),
            total_supermarkets: product.total_supermarkets ?? supermarkets.length,
            alternative_names: Array.isArray(product.alternative_names) ? product.alternative_names : [],
            display_name: product.canonname || product.display_name || 'Producto',
            has_stock: mappedSupermarkets.some(entry => entry.stock),
            best_price: mappedSupermarkets.length > 0
              ? mappedSupermarkets.reduce((best: any, current: any) =>
                  current.precio < best.precio ? current : best
                )
              : undefined,
            imageUrl: product.imageUrl,
          };
        });
      }
      
      // Si es array directo de productos [{ canonname, supermarkets, ... }, ...]
      if (firstItem.canonname || firstItem.supermarkets || (firstItem.json && (firstItem.json.canonname || firstItem.json.supermarkets))) {
        console.log('📦 [HomeScreen] Detected direct array format: [product1, product2, ...]');
        return payload.map((item: any) => {
          const product = item.json || item;
          const supermarkets = Array.isArray(product.supermarkets) ? product.supermarkets : [];
          const mappedSupermarkets = supermarkets.map((market: any) => ({
            canonid: product.canonid || '',
            canonname: product.canonname || product.display_name || 'Producto',
            precio: Number(market.precio ?? market.price ?? 0),
            supermercado: market.supermercado || market.super || market.supermarket || 'supermercado',
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            stock: Boolean(market.stock),
            url: market.url || '',
            imageUrl: market.imageUrl || product.imageUrl,
            brand: product.brand,
            addToCartLink: market.addToCartLink || market.add_to_cart_link,
          }));

          return {
            ean: product.ean || product.canonid || '',
            exact_weight: product.exact_weight || '',
            brand: product.brand || '',
            products: mappedSupermarkets,
            min_price: Number(product.min_price ?? 0),
            max_price: Number(product.max_price ?? 0),
            total_supermarkets: product.total_supermarkets ?? supermarkets.length,
            alternative_names: Array.isArray(product.alternative_names) ? product.alternative_names : [],
            display_name: product.canonname || product.display_name || 'Producto',
            has_stock: mappedSupermarkets.some(entry => entry.stock),
            best_price: mappedSupermarkets.length > 0
              ? mappedSupermarkets.reduce((best: any, current: any) =>
                  current.precio < best.precio ? current : best
                )
              : undefined,
            imageUrl: product.imageUrl,
          };
        });
      }
    }
    
    // ⭐ CASO 2: Formato antiguo (compatibilidad)
    const blocks = Array.isArray(payload) ? payload : [payload];
    const groups: any[] = [];

    blocks.forEach(block => {
      const items = Array.isArray(block?.items) ? block.items : [];
      items.forEach((item: any) => {
        const meta = item?.meta || {};
        const products = Array.isArray(item?.products) ? item.products : [];

        products.forEach((product: any) => {
          const supermarkets = Array.isArray(product?.supermarkets) ? product.supermarkets : [];
          const mappedSupermarkets = supermarkets.map((market: any, index: number) => ({
            canonid: product.canonid || meta.canonid || `quick-${index}`,
            canonname: product.canonname || meta.canonname || item.query || 'Producto',
            precio: Number(market.precio ?? market.price ?? product.min_price ?? 0),
            supermercado: market.supermercado || market.super || market.supermarket || 'supermercado',
            ean: product.canonid || meta.canonid || '',
            exact_weight: product.exact_weight || meta.exact_weight || '',
            stock: Boolean(market.stock),
            url: market.url || '',
            imageUrl: market.imageUrl || product.imageUrl || meta.imageUrl,
            brand: product.brand || meta.brand,
            addToCartLink: market.addToCartLink || market.add_to_cart_link,
          }));

          groups.push({
            ean: product.canonid || meta.canonid || '',
            exact_weight: product.exact_weight || meta.exact_weight || '',
            brand: product.brand || meta.brand,
            products: mappedSupermarkets,
            min_price: Number(product.min_price ?? meta.min_price ?? 0),
            max_price: Number(product.max_price ?? meta.max_price ?? 0),
            total_supermarkets: Number(product.total_supermarkets ?? supermarkets.length),
            alternative_names: [],
            display_name: product.canonname || meta.canonname || item.query || 'Producto',
            has_stock: mappedSupermarkets.some(entry => entry.stock),
            best_price:
              mappedSupermarkets.length > 0
                ? mappedSupermarkets.reduce((best, current) =>
                    current.precio < best.precio ? current : best
                  )
                : undefined,
            imageUrl: product.imageUrl || meta.imageUrl,
          });
        });
      });
    });

    console.log('📦 [HomeScreen] Normalized groups count:', groups.length);
    return groups;
  };

  const handleQuickSearch = async (item: QuickSearchItem) => {
    setQuickSearchLoading(item.query);
    try {
      console.log('🔍 [HomeScreen] Quick search for:', item.label, 'query:', item.query);
      const quickSearchUrl = `${getQuickSearchEndpoint()}?q=${encodeURIComponent(item.query)}`;
      console.log('🔍 [HomeScreen] Quick search URL:', quickSearchUrl);
      const response = await fetch(quickSearchUrl);

      if (!response.ok) {
        throw new Error('quick_search_failed');
      }

      const payload = await response.json();
      console.log('📦 [HomeScreen] Quick search raw response:', typeof payload, Array.isArray(payload) ? `array[${payload.length}]` : 'object');
      console.log('📦 [HomeScreen] Quick search response preview:', JSON.stringify(payload, null, 2).substring(0, 1000));
      
      const prefetchedGroups = normalizeQuickSearchResponse(payload);
      console.log('✅ [HomeScreen] Normalized groups:', prefetchedGroups.length);
      
      if (prefetchedGroups.length === 0) {
        console.warn('⚠️ [HomeScreen] No groups normalized, falling back to regular search');
        navigation.navigate('Search', { initialQuery: item.query });
        return;
      }
      
      const targetQuery = item.query;

      navigation.navigate('Search', {
        initialQuery: targetQuery,
        prefetchedGroups,
        quickSearchMeta: { category: item.label, source: 'quick_search' },
        fromQuickSearch: true, // ⭐ Marcar que viene de quick_search
      });
    } catch (error) {
      console.error('❌ [HomeScreen] Quick search error:', error);
      Alert.alert(
        'No se pudo cargar',
        'Intentaremos abrir la búsqueda tradicional para esta categoría.'
      );
      navigation.navigate('Search', { initialQuery: item.query });
    } finally {
      setQuickSearchLoading(null);
    }
  };

  const renderQuickSearchItem = (item: QuickSearchItem) => (
    <TouchableOpacity
      key={item.query}
      style={[
        styles.quickSearchItem,
        quickSearchLoading === item.query && styles.quickSearchItemLoading,
      ]}
      onPress={() => handleQuickSearch(item)}
      disabled={quickSearchLoading === item.query}
    >
      <View style={styles.quickSearchIcon}>
        {quickSearchLoading === item.query ? (
          <ActivityIndicator size="small" color={item.color} />
        ) : (
          item.iconSet === 'mci' ? (
            <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
          ) : (
            <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={24} color={item.color} />
          )
        )}
      </View>
      <Text style={styles.quickSearchLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>¡Hola! 👋</Text>
            <Text style={styles.subtitle}>Encuentra los mejores precios</Text>
          </View>
          
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color="#6c757d" />
          <Text style={styles.searchButtonText}>Buscar productos...</Text>
        </TouchableOpacity>

        <View style={styles.alertBanner}>
          <Ionicons name="alert-circle" size={16} color="#b45309" style={styles.alertIcon} />
          <Text style={styles.alertText}>
            Verifica los precios finales en la web del supermercado; pueden existir promociones vigentes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Búsquedas rápidas</Text>
          <View style={styles.quickSearchGrid}>
            {QUICK_SEARCH_ITEMS.map(renderQuickSearchItem)}
          </View>
        </View>

        <PopularProducts onProductSelect={handleProductSelect} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>ScrapMarket v1.0 • Optimizado para móvil</Text>
          <Text style={styles.footerText}>Datos actualizados cada 6 horas</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  alertIcon: {
    marginRight: 8,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickSearchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  quickSearchItem: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickSearchItemLoading: {
    opacity: 0.6,
  },
  quickSearchIcon: {
    marginBottom: 8,
  },
  quickSearchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
});

export default HomeScreen;



