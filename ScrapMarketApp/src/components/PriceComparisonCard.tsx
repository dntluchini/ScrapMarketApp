import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchResult } from '../services/searchService';
import { productGroupingService } from '../services/productGroupingService';

interface PriceComparisonCardProps {
  product: SearchResult;
  onPress: () => void;
}

const PriceComparisonCard: React.FC<PriceComparisonCardProps> = ({ product, onPress }) => {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };
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
            {productGroupingService.formatSearchResultName(product)}
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
                  <Ionicons 
                    name={supermarket.stock ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={supermarket.stock ? "#4CAF50" : "#F44336"} 
                  />
                  <Text style={[
                    styles.stockText,
                    { color: supermarket.stock ? "#4CAF50" : "#F44336" }
                  ]}>
                    {supermarket.stock ? "En stock" : "Sin stock"}
                  </Text>
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 24,
  },
  supermarketCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  minPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  supermarketsList: {
    marginBottom: 16,
  },
  supermarketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supermarketPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
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
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastUpdate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertButtonText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
});

export default PriceComparisonCard;



