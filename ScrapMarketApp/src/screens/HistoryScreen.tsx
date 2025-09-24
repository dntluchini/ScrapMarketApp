import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { historyService, ProductHistory, PriceHistoryEntry } from '../services/historyService';
import { productGroupingService } from '../services/productGroupingService';

interface HistoryScreenProps {
  navigation: any;
  route?: {
    params?: {
      productId?: string;
      productName?: string;
    };
  };
}

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation, route }: HistoryScreenProps) {
  const [history, setHistory] = useState<ProductHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const productId = route?.params?.productId;
  const productName = route?.params?.productName;

  useEffect(() => {
    if (productId) {
      loadProductHistory();
    } else {
      // If no specific product, show general history or redirect
      navigation.goBack();
    }
  }, [productId, selectedPeriod]);

  const loadProductHistory = async () => {
    if (!productId) return;
    
    try {
      setIsLoading(true);
      const response = await historyService.getProductHistory(productId);
      setHistory(response.data);
    } catch (error) {
      console.error('Error loading product history:', error);
      Alert.alert('Error', 'No se pudo cargar el historial del producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProductHistory();
    setIsRefreshing(false);
  };

  const getFilteredHistory = (): PriceHistoryEntry[] => {
    if (!history?.history) return [];
    
    const now = new Date();
    let cutoffDate = new Date();
    
    switch (selectedPeriod) {
      case '7d':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        cutoffDate.setDate(now.getDate() - 90);
        break;
      case 'all':
      default:
        return history.history;
    }
    
    return history.history.filter(entry => new Date(entry.date) >= cutoffDate);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriceChangeColor = (currentPrice: number, previousPrice: number) => {
    if (currentPrice < previousPrice) return '#4CAF50'; // Green for decrease
    if (currentPrice > previousPrice) return '#F44336'; // Red for increase
    return '#666'; // Gray for no change
  };

  const getPriceChangeIcon = (currentPrice: number, previousPrice: number) => {
    if (currentPrice < previousPrice) return 'trending-down';
    if (currentPrice > previousPrice) return 'trending-up';
    return 'remove';
  };

  const renderHistoryEntry = ({ item, index }: { item: PriceHistoryEntry; index: number }) => {
    const filteredHistory = getFilteredHistory();
    const previousEntry = index > 0 ? filteredHistory[index - 1] : null;
    const priceChange = previousEntry ? item.price - previousEntry.price : 0;
    const priceChangePercent = previousEntry ? (priceChange / previousEntry.price) * 100 : 0;

    return (
      <View style={styles.historyItem}>
        <View style={styles.historyLeft}>
          <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
          <Text style={styles.historyTime}>{formatTime(item.date)}</Text>
          <Text style={styles.historySupermarket}>{item.supermarket}</Text>
        </View>
        
        <View style={styles.historyCenter}>
          <Text style={styles.historyPrice}>{formatPrice(item.price)}</Text>
          {previousEntry && (
            <View style={styles.priceChangeContainer}>
              <Ionicons 
                name={getPriceChangeIcon(item.price, previousEntry.price)} 
                size={16} 
                color={getPriceChangeColor(item.price, previousEntry.price)} 
              />
              <Text style={[
                styles.priceChange,
                { color: getPriceChangeColor(item.price, previousEntry.price) }
              ]}>
                {priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.historyRight}>
          <View style={[
            styles.stockIndicator,
            { backgroundColor: item.stock ? '#4CAF50' : '#F44336' }
          ]}>
            <Ionicons 
              name={item.stock ? 'checkmark' : 'close'} 
              size={12} 
              color="#fff" 
            />
          </View>
        </View>
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['7d', '30d', '90d', 'all'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive
          ]}>
            {period === '7d' ? '7 días' : 
             period === '30d' ? '30 días' : 
             period === '90d' ? '90 días' : 'Todo'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStats = () => {
    const filteredHistory = getFilteredHistory();
    if (filteredHistory.length === 0) return null;

    const prices = filteredHistory.map(entry => entry.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const latestPrice = filteredHistory[0]?.price || 0;
    const oldestPrice = filteredHistory[filteredHistory.length - 1]?.price || 0;
    const totalChange = latestPrice - oldestPrice;
    const totalChangePercent = oldestPrice > 0 ? (totalChange / oldestPrice) * 100 : 0;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Precio Actual</Text>
          <Text style={styles.statValue}>{formatPrice(latestPrice)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Promedio</Text>
          <Text style={styles.statValue}>{formatPrice(avgPrice)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Rango</Text>
          <Text style={styles.statValue}>
            {formatPrice(minPrice)} - {formatPrice(maxPrice)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Cambio Total</Text>
          <Text style={[
            styles.statValue,
            { color: getPriceChangeColor(latestPrice, oldestPrice) }
          ]}>
            {totalChangePercent > 0 ? '+' : ''}{totalChangePercent.toFixed(1)}%
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  if (!history) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>No se pudo cargar el historial</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProductHistory}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredHistory = getFilteredHistory();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {history.canonname && history.brand ? `${history.brand} ${history.canonname}` : productName}
          </Text>
          <Text style={styles.headerSubtitle}>
            Historial de precios
          </Text>
        </View>
      </View>

      {renderPeriodSelector()}
      {renderStats()}

      <FlatList
        data={filteredHistory}
        renderItem={renderHistoryEntry}
        keyExtractor={(item, index) => `${item.date}-${item.supermarket}-${index}`}
        style={styles.historyList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No hay historial disponible para este período
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  historySupermarket: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 2,
  },
  historyCenter: {
    flex: 1,
    alignItems: 'center',
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  priceChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceChange: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  historyRight: {
    alignItems: 'center',
  },
  stockIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
});