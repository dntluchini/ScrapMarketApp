import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProductDetailsScreenProps {
  navigation: any;
  route: any;
}

interface Product {
  id: string;
  name: string;
  price: number;
  market: string;
  image?: string;
}

export const ProductDetailsScreen: React.FC<ProductDetailsScreenProps> = ({ navigation, route }) => {
  const { product }: { product: Product } = route.params;
  const [isAlertSet, setIsAlertSet] = useState(false);

  const handleSetAlert = () => {
    Alert.alert(
      'Set Price Alert',
      `Do you want to be notified when the price of "${product.name}" changes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set Alert', 
          onPress: () => {
            setIsAlertSet(true);
            Alert.alert('Success', 'Price alert has been set!');
          }
        },
      ]
    );
  };

  const handleRemoveAlert = () => {
    Alert.alert(
      'Remove Alert',
      'Do you want to remove this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          onPress: () => {
            setIsAlertSet(false);
            Alert.alert('Success', 'Price alert has been removed!');
          }
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={isAlertSet ? handleRemoveAlert : handleSetAlert}>
          <Ionicons 
            name={isAlertSet ? "notifications" : "notifications-outline"} 
            size={24} 
            color={isAlertSet ? "#007AFF" : "#666"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.productCard}>
        <View style={styles.productImage}>
          <Ionicons name="image-outline" size={64} color="#ccc" />
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productMarket}>{product.market}</Text>
          <Text style={styles.productPrice}>${product.price}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price History</Text>
        <View style={styles.priceHistoryItem}>
          <Text style={styles.priceHistoryDate}>Today</Text>
          <Text style={styles.priceHistoryPrice}>${product.price}</Text>
        </View>
        <View style={styles.priceHistoryItem}>
          <Text style={styles.priceHistoryDate}>Yesterday</Text>
          <Text style={styles.priceHistoryPrice}>${(product.price * 1.1).toFixed(2)}</Text>
        </View>
        <View style={styles.priceHistoryItem}>
          <Text style={styles.priceHistoryDate}>Last Week</Text>
          <Text style={styles.priceHistoryPrice}>${(product.price * 0.95).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Similar Products</Text>
        <View style={styles.similarProduct}>
          <Text style={styles.similarProductName}>{product.name} - Alternative Brand</Text>
          <Text style={styles.similarProductPrice}>${(product.price * 0.8).toFixed(2)}</Text>
        </View>
        <View style={styles.similarProduct}>
          <Text style={styles.similarProductName}>{product.name} - Premium Version</Text>
          <Text style={styles.similarProductPrice}>${(product.price * 1.3).toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleSetAlert}
        >
          <Ionicons name="notifications" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>
            {isAlertSet ? 'Alert Set' : 'Set Price Alert'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => navigation.navigate('Search')}
        >
          <Ionicons name="search" size={20} color="#007AFF" />
          <Text style={styles.secondaryButtonText}>Search Similar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  productCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  productInfo: {
    alignItems: 'center',
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  productMarket: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  priceHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  priceHistoryDate: {
    fontSize: 16,
    color: '#666',
  },
  priceHistoryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  similarProduct: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  similarProductName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  similarProductPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  actions: {
    padding: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
