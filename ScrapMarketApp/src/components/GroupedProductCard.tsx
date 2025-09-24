import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { GroupedProduct, productGroupingService } from '../services/productGroupingService';
import { useProductModal } from '../hooks/useProductModal';
import { cleanProductName } from '../utils/productNameUtils';
import { ProductHeader } from './ProductCard/ProductHeader';
import { ProductFooter } from './ProductCard/ProductFooter';
import { SupermarketItem } from './ProductCard/SupermarketItem';

interface GroupedProductCardProps {
  group: GroupedProduct;
  onPress?: () => void;
}

/**
 * Componente optimizado para mostrar productos agrupados
 * Sigue las mejores prácticas de React Native para performance
 */
export const GroupedProductCard = React.memo<GroupedProductCardProps>(({
  group,
  onPress,
}) => {
  const { showDetails, openModal, closeModal } = useProductModal();
  
  // Validación de datos para evitar errores
  if (!group || !group.products || !Array.isArray(group.products)) {
    console.warn('GroupedProductCard: Invalid group data', group);
    return null;
  }
  
  // Memoizar callbacks para evitar re-renders innecesarios
  const handleCardPress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      openModal();
    }
  }, [onPress, openModal]);

  const handleSupermarketPress = useCallback((item: any) => {
    // TODO: Implementar navegación al supermercado
    console.log('Navigate to supermarket:', item.supermercado);
  }, []);

  const renderSupermarketItem = useCallback(({ item }: { item: any }) => (
    <SupermarketItem 
      item={item} 
      onPress={() => handleSupermarketPress(item)}
    />
  ), [handleSupermarketPress]);

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <ProductHeader group={group} />
        
        {/* Lista de supermercados */}
        <View style={styles.supermarketsList}>
          {group.products.map((productItem: any, index: number) => (
            <SupermarketItem
              key={`${productItem.supermercado}_${index}`}
              item={productItem}
              onPress={() => handleSupermarketPress(productItem)}
            />
          ))}
        </View>
        
        <ProductFooter group={group} />
      </TouchableOpacity>
      
      {/* Modal con detalles */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {productGroupingService.formatProductNameWithBrand(group)}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalInfo}>
              <Text style={styles.modalEan}>EAN: {group.ean}</Text>
            </View>
            
            <ScrollView style={styles.supermarketsList}>
              <Text style={styles.modalTitle}>Precios por Supermercado:</Text>
              <FlatList
                data={group.products}
                renderItem={renderSupermarketItem}
                keyExtractor={(item, index) => `${item.supermercado}_${index}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
});

GroupedProductCard.displayName = 'GroupedProductCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  supermarketsList: {
    marginVertical: 8,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalEan: {
    fontSize: 14,
    color: '#666',
  },
});