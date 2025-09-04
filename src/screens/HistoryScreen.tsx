import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HistoryScreenProps {
  navigation: any;
}

interface PriceHistoryItem {
  id: string;
  productName: string;
  price: number;
  market: string;
  date: string;
  change: number; // positive for increase, negative for decrease
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [historyItems, setHistoryItems] = useState<PriceHistoryItem[]>([
    {
      id: '1',
      productName: 'Milk 1L',
      price: 15.99,
      market: 'Carrefour',
      date: '2025-09-04',
      change: -0.50,
    },
    {
      id: '2',
      productName: 'Bread',
      price: 8.50,
      market: 'Jumbo',
      date: '2025-09-04',
      change: 0.25,
    },
    {
      id: '3',
      productName: 'Eggs (12 units)',
      price: 12.00,
      market: 'Carrefour',
      date: '2025-09-03',
      change: -1.00,
    },
    {
      id: '4',
      productName: 'Chicken (1kg)',
      price: 25.99,
      market: 'Jumbo',
      date: '2025-09-03',
      change: 2.00,
    },
  ]);

  const getChangeColor = (change: number) => {
    if (change > 0) return '#FF3B30'; // Red for increase
    if (change < 0) return '#34C759'; // Green for decrease
    return '#666'; // Gray for no change
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return 'trending-up';
    if (change < 0) return 'trending-down';
    return 'remove';
  };

  const renderHistoryItem = ({ item }: { item: PriceHistoryItem }) => (
    <TouchableOpacity 
      style={styles.historyCard}
      onPress={() => navigation.navigate('ProductDetails', { 
        product: {
          id: item.id,
          name: item.productName,
          price: item.price,
          market: item.market,
        }
      })}
    >
      <View style={styles.historyHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.marketName}>{item.market}</Text>
        </View>
        <View style={styles.priceInfo}>
          <Text style={styles.price}>${item.price}</Text>
          <View style={styles.changeContainer}>
            <Ionicons 
              name={getChangeIcon(item.change)} 
              size={16} 
              color={getChangeColor(item.change)} 
            />
            <Text style={[styles.change, { color: getChangeColor(item.change) }]}>
              ${Math.abs(item.change).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.historyFooter}>
        <Text style={styles.date}>{item.date}</Text>
        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price History</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={20} color="#666" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.sortButton}>
          <Ionicons name="swap-vertical" size={20} color="#666" />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={historyItems}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => item.id}
        style={styles.historyList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Price History</Text>
            <Text style={styles.emptyStateText}>
              Start searching for products to build your price history
            </Text>
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={() => navigation.navigate('Search')}
            >
              <Text style={styles.searchButtonText}>Start Searching</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  filterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  marketName: {
    fontSize: 14,
    color: '#666',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
