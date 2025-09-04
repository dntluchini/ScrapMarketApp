import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '../services/searchService';

interface PriceComparisonCardProps {
  product: SearchResult;
  onPress: () => void;
}

export const PriceComparisonCard: React.FC<PriceComparisonCardProps> = ({ product, onPress }) => {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSupermarketPress = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const getMarketIcon = (marketName: string) => {
    const name = marketName.toLowerCase();
    if (name.includes('carrefour')) return 'storefront';
    if (name.includes('jumbo')) return 'basket';
    if (name.includes('disco')) return 'pricetag';
    if (name.includes('vea')) return 'home';
    return 'storefront';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.canonname}
          </Text>
          <Text style={styles.supermarketCount}>
            {product.total_supermarkets} supermercados
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.minPrice}>Min: {formatPrice(product.min_price)}</Text>
          <Text style={styles.priceRange}>
            {formatPrice(product.min_price)} - {formatPrice(product.max_price)}
          </Text>
        </View>
      </View>

      {/* Supermarkets List */}
      <View style={styles.supermarketsList}>
        {product.supermarkets.map((supermarket, index) => (
          <View key={index} style={styles.supermarketItem}>
            <View style={styles.supermarketInfo}>
              <View style={styles.supermarketHeader}>
                <Ionicons 
                  name={getMarketIcon(supermarket.super)} 
                  size={20} 
                  color="#007AFF" 
                />
                <Text style={styles.supermarketName}>{supermarket.super}</Text>
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.supermarketPrice}>{formatPrice(supermarket.precio)}</Text>
                <View style={styles.stockContainer}>
                  <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                  <Text style={styles.stockText}>En stock</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.viewButton}
              onPress={() => handleSupermarketPress(supermarket.url)}
            >
              <Text style={styles.viewButtonText}>Ver</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.lastUpdate}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.lastUpdateText}>
            Última captura: {formatDate(product.last_updated)}
          </Text>
        </View>
        <TouchableOpacity style={styles.alertButton}>
          <Ionicons name="notifications-outline" size={16} color="#007AFF" />
          <Text style={styles.alertButtonText}>Crear alerta</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  supermarketCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  minPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 2,
  },
  priceRange: {
    fontSize: 12,
    color: '#8E8E93',
  },
  supermarketsList: {
    marginBottom: 16,
  },
  supermarketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supermarketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supermarketPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
  },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
  },
});
