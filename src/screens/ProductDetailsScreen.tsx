import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { n8nMcpService } from '../services/n8nMcpService';
import { historyService, ProductHistory } from '../services/historyService';
import { alertService } from '../services/alertService';
import { productGroupingService } from '../services/productGroupingService';

interface ProductDetailsScreenProps {
  route: {
    params: {
      productId: string;
      productName: string;
      groupedProduct?: any; // Grupo completo del producto
    };
  };
  navigation: any;
}

export default function ProductDetailsScreen({ route, navigation }: ProductDetailsScreenProps) {
  const { productId, productName, groupedProduct } = route.params;
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<ProductHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateAlert, setShowCreateAlert] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      setIsLoading(true);
      
      // Si tenemos el grupo completo, usarlo directamente
      if (groupedProduct) {
        console.log('🔍 Usando grupo pasado como parámetro:', groupedProduct);
        console.log('🔍 Supermercados en el grupo:', groupedProduct.supermarkets);
        console.log('🔍 Productos en el grupo:', groupedProduct.products);
        setProduct(groupedProduct);
        
        // Solo cargar historial
        try {
          const historyData = await historyService.getProductHistory(productId);
          setHistory(historyData?.data || null);
        } catch (error) {
          console.log('No se pudo cargar historial:', error);
          setHistory(null);
        }
      } else {
        // Si no tenemos el grupo, hacer búsqueda (fallback)
        console.log('🔍 Haciendo búsqueda de fallback para:', productId);
        const [productData, historyData] = await Promise.all([
          n8nMcpService.searchProducts(productId),
          historyService.getProductHistory(productId).catch(() => null)
        ]);

        setProduct(productData?.[0] || productData);
        setHistory(historyData?.data || null);
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      Alert.alert('Error', 'No se pudo cargar la información del producto');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadProductDetails();
    setIsRefreshing(false);
  };

  const handleCreateAlert = async () => {
    if (!targetPrice || isNaN(Number(targetPrice))) {
      Alert.alert('Error', 'Ingresa un precio válido');
      return;
    }

    try {
      await alertService.createAlert({
        userId: 'current-user', // This would come from auth context
        productName: productName,
        canonname: productId,
        targetPrice: Number(targetPrice),
        isActive: true,
      });

      Alert.alert('Éxito', 'Alerta creada correctamente');
      setShowCreateAlert(false);
      setTargetPrice('');
    } catch (error) {
      console.error('Error creating alert:', error);
      Alert.alert('Error', 'No se pudo crear la alerta');
    }
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>No se pudo cargar el producto</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProductDetails}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Product Header */}
      <View style={styles.header}>
        <Text style={styles.productName}>{productGroupingService.formatProductNameWithBrand(product) || productName}</Text>
        <View style={styles.priceRange}>
          <Text style={styles.priceText}>
            {formatPrice(product.min_price || 0)} - {formatPrice(product.max_price || 0)}
          </Text>
          <Text style={styles.supermarketsCount}>
            {product.total_supermarkets || (product.products ? product.products.length : 0)} supermercados
          </Text>
        </View>
        {product.exact_weight && (
          <Text style={styles.productWeight}>Peso: {product.exact_weight}</Text>
        )}
        {product.ean && (
          <Text style={styles.productEan}>EAN: {product.ean}</Text>
        )}
      </View>

      {/* Supermarkets List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Precios por Supermercado</Text>
        {console.log('🔍 Renderizando supermercados - product.supermarkets:', product.supermarkets)}
        {console.log('🔍 Renderizando supermercados - product.products:', product.products)}
        {product.supermarkets && product.supermarkets.length > 0 ? (
          product.supermarkets.map((supermarket: any, index: number) => (
            <View key={index} style={styles.supermarketItem}>
              <View style={styles.supermarketInfo}>
                <Text style={styles.supermarketName}>{supermarket.super}</Text>
                <Text style={styles.supermarketPrice}>
                  {formatPrice(supermarket.precio)}
                </Text>
              </View>
              <View style={styles.supermarketStatus}>
                {supermarket.stock ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                )}
                <Text style={[
                  styles.stockText,
                  { color: supermarket.stock ? '#4CAF50' : '#F44336' }
                ]}>
                  {supermarket.stock ? 'En stock' : 'Sin stock'}
                </Text>
              </View>
            </View>
          ))
        ) : product.products && product.products.length > 0 ? (
          // Si es un grupo con productos individuales
          product.products.map((productItem: any, index: number) => (
            <View key={index} style={styles.supermarketItem}>
              <View style={styles.supermarketInfo}>
                <Text style={styles.supermarketName}>{productItem.supermercado}</Text>
                <Text style={styles.supermarketPrice}>
                  {formatPrice(productItem.precio)}
                </Text>
              </View>
              <View style={styles.supermarketStatus}>
                {productItem.stock ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                ) : (
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                )}
                <Text style={[
                  styles.stockText,
                  { color: productItem.stock ? '#4CAF50' : '#F44336' }
                ]}>
                  {productItem.stock ? 'En stock' : 'Sin stock'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No hay datos de supermercados disponibles</Text>
        )}
      </View>

      {/* Price History */}
      {history && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Precios</Text>
          <View style={styles.historyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Precio Promedio</Text>
              <Text style={styles.statValue}>{formatPrice(history.averagePrice)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rango</Text>
              <Text style={styles.statValue}>
                {formatPrice(history.priceRange.min)} - {formatPrice(history.priceRange.max)}
              </Text>
            </View>
          </View>
          
          {history.history && history.history.length > 0 && (
            <View style={styles.historyList}>
              {history.history.slice(0, 5).map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyDate}>{formatDate(entry.date)}</Text>
                  <Text style={styles.historyPrice}>{formatPrice(entry.price)}</Text>
                  <Text style={styles.historySupermarket}>{entry.supermarket}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowCreateAlert(true)}
        >
          <Ionicons name="notifications" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Crear Alerta</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('History', { productId })}
        >
          <Ionicons name="time" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Ver Historial</Text>
        </TouchableOpacity>
      </View>

      {/* Create Alert Modal */}
      {showCreateAlert && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Alerta de Precio</Text>
            <Text style={styles.modalSubtitle}>
              Te notificaremos cuando el precio baje de:
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Precio objetivo (ARS)</Text>
              <TextInput
                style={styles.priceInput}
                value={targetPrice}
                onChangeText={setTargetPrice}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateAlert(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleCreateAlert}
              >
                <Text style={styles.confirmButtonText}>Crear Alerta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
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
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  supermarketsCount: {
    fontSize: 14,
    color: '#666',
  },
  productWeight: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  productEan: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  supermarketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  supermarketPrice: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  supermarketStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 12,
    marginLeft: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyList: {
    marginTop: 8,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  historyPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
    textAlign: 'center',
  },
  historySupermarket: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});