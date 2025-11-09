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
import { Ionicons } from '@expo/vector-icons';
import PopularProducts from '../components/PopularProducts';

interface HomeScreenProps {
  navigation: any;
}

type QuickSearchItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  query: string;
};

const QUICK_SEARCH_ENDPOINT = 'http://192.168.1.99:5678/webhook/quick_search';

const QUICK_SEARCH_ITEMS: QuickSearchItem[] = [
  { icon: 'water-outline', label: 'Agua', query: 'agua' },
  { icon: 'nutrition-outline', label: 'Vegetales', query: 'vegetales' },
  { icon: 'fast-food-outline', label: 'Carnes', query: 'carnes' },
  { icon: 'wine-outline', label: 'Bebidas', query: 'bebidas' },
  { icon: 'ice-cream-outline', label: 'L\u00E1cteos', query: 'l\u00E1cteos' },
  { icon: 'pizza-outline', label: 'Panader\u00EDa', query: 'panader\u00EDa' },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [quickSearchLoading, setQuickSearchLoading] = useState<string | null>(null);

  const handleProductSelect = (query: string) => {
    navigation.navigate('Search', { initialQuery: query });
  };

  const normalizeQuickSearchResponse = (payload: any): any[] => {
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
            supermercado: market.super || market.supermarket || 'supermercado',
            ean: product.canonid || meta.canonid || '',
            exact_weight: product.exact_weight || meta.exact_weight || '',
            stock: Boolean(market.stock),
            url: market.url || '',
            imageUrl: market.imageUrl || product.imageUrl || meta.imageUrl,
            brand: product.brand || meta.brand,
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
          });
        });
      });
    });

    return groups;
  };

  const handleQuickSearch = async (item: QuickSearchItem) => {
    setQuickSearchLoading(item.query);
    try {
      const response = await fetch(
        `${QUICK_SEARCH_ENDPOINT}?q=${encodeURIComponent(item.query)}`
      );

      if (!response.ok) {
        throw new Error('quick_search_failed');
      }

      const payload = await response.json();
      const prefetchedGroups = normalizeQuickSearchResponse(payload);
      const targetQuery = item.query;

      navigation.navigate('Search', {
        initialQuery: targetQuery,
        prefetchedGroups,
        quickSearchMeta: { category: item.label, source: 'quick_search' },
      });
    } catch (error) {
      console.error('Quick search error:', error);
      Alert.alert(
        'No se pudo cargar',
        'Intentaremos abrir la b\u00FAsqueda tradicional para esta categor\u00EDa.'
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
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Ionicons name={item.icon} size={24} color="#007AFF" />
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
          <TouchableOpacity
            style={[styles.dataSaverToggle, dataSaverMode && styles.dataSaverActive]}
            onPress={() => setDataSaverMode(!dataSaverMode)}
          >
            <Ionicons
              name={dataSaverMode ? 'leaf' : 'leaf-outline'}
              size={20}
              color={dataSaverMode ? '#28a745' : '#6c757d'}
            />
          </TouchableOpacity>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Características</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="flash" size={20} color="#28a745" />
              <Text style={styles.featureText}>Resultados en 0.5-2 segundos</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="trending-up" size={20} color="#007AFF" />
              <Text style={styles.featureText}>Comparación de precios en tiempo real</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications" size={20} color="#FF9800" />
              <Text style={styles.featureText}>Alertas de ofertas</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="leaf" size={20} color="#28a745" />
              <Text style={styles.featureText}>Modo ahorro de datos</Text>
            </View>
          </View>
        </View>

        {dataSaverMode && (
          <View style={styles.dataSaverInfo}>
            <Ionicons name="information-circle" size={20} color="#28a745" />
            <Text style={styles.dataSaverInfoText}>
              Modo ahorro activo: Reduce consumo de datos móviles en 50%
            </Text>
          </View>
        )}

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
  dataSaverToggle: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dataSaverActive: {
    borderColor: '#28a745',
    backgroundColor: '#f8fff8',
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
  featuresList: {
    paddingHorizontal: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  featureText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  dataSaverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  dataSaverInfoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#28a745',
    flex: 1,
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

