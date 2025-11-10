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
import { Ionicons } from '@expo/vector-icons';
import { GroupedProduct, productGroupingService } from '../services/productGroupingService';
import { useProductModal } from '../hooks/useProductModal';
import { ProductHeader } from './ProductCard/ProductHeader';
import { SupermarketItem } from './ProductCard/SupermarketItem';

interface GroupedProductCardProps {
  group: GroupedProduct;
  onPress?: () => void;
}

/**
 * Componente optimizado para mostrar productos agrupados
 * Sigue buenas practicas de React Native para performance
 */
const capitalizeTitle = (value: string): string =>
  value
    ?.split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ') || '';

export const GroupedProductCard = React.memo<GroupedProductCardProps>(({
  group,
  onPress,
}) => {
  const { showDetails, openModal, closeModal } = useProductModal();

  // Validacion de datos para evitar errores
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
    // TODO: Implementar navegacion al supermercado
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
        style={styles.card}
        onPress={handleCardPress}
        activeOpacity={0.85}
      >
        <ProductHeader group={group} />

        <View style={styles.divider} />

        <View style={styles.supermarketsList}>
          {group.products.map((productItem: any, index: number) => (
            <SupermarketItem
              key={`${productItem.supermercado}_${index}`}
              item={productItem}
              onPress={() => handleSupermarketPress(productItem)}
            />
          ))}
        </View>

      </TouchableOpacity>

      {/* Modal con detalles */}
      <Modal
        visible={showDetails}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {capitalizeTitle(productGroupingService.formatProductNameWithBrand(group))}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={20} color="#1f2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalSubtitle}>Precios por supermercado</Text>
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
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#0d2233',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  supermarketsList: {
    marginBottom: 16,
  },
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
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: '90%',
  },
  closeButton: {
    padding: 8,
  },
});
