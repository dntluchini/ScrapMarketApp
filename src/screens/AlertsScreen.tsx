import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertsScreenProps {
  navigation: any;
}

interface PriceAlert {
  id: string;
  productName: string;
  currentPrice: number;
  targetPrice: number;
  market: string;
  isActive: boolean;
  createdAt: string;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({ navigation }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([
    {
      id: '1',
      productName: 'Milk 1L',
      currentPrice: 15.99,
      targetPrice: 12.00,
      market: 'Carrefour',
      isActive: true,
      createdAt: '2025-09-04',
    },
    {
      id: '2',
      productName: 'Bread',
      currentPrice: 8.50,
      targetPrice: 6.00,
      market: 'Jumbo',
      isActive: true,
      createdAt: '2025-09-03',
    },
  ]);

  const handleToggleAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, isActive: !alert.isActive }
        : alert
    ));
  };

  const handleDeleteAlert = (alertId: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this price alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setAlerts(alerts.filter(alert => alert.id !== alertId));
          }
        },
      ]
    );
  };

  const renderAlert = ({ item }: { item: PriceAlert }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.marketName}>{item.market}</Text>
        </View>
        <TouchableOpacity 
          onPress={() => handleToggleAlert(item.id)}
          style={styles.toggleButton}
        >
          <Ionicons 
            name={item.isActive ? "notifications" : "notifications-off"} 
            size={24} 
            color={item.isActive ? "#007AFF" : "#ccc"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.priceInfo}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.currentPrice}>${item.currentPrice}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Target Price</Text>
          <Text style={styles.targetPrice}>${item.targetPrice}</Text>
        </View>
      </View>

      <View style={styles.alertActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => navigation.navigate('EditAlert', { alert: item })}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteAlert(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Price Alerts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateAlert')}>
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        style={styles.alertsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Price Alerts</Text>
            <Text style={styles.emptyStateText}>
              Set up price alerts to be notified when products reach your target price
            </Text>
            <TouchableOpacity 
              style={styles.createAlertButton}
              onPress={() => navigation.navigate('CreateAlert')}
            >
              <Text style={styles.createAlertButtonText}>Create Alert</Text>
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
  alertsList: {
    flex: 1,
    padding: 20,
  },
  alertCard: {
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
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  marketName: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    padding: 8,
  },
  priceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  targetPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  createAlertButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createAlertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
