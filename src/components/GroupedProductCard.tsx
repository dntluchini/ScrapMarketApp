import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { GroupedProduct } from '../services/productGroupingService';
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
export const GroupedProductCard = React.memo<GroupedProductCardProps>(({
  group,
  onPress,
}) => {
  // Validacion de datos para evitar errores
  if (!group || !group.products || !Array.isArray(group.products)) {
    console.warn('GroupedProductCard: Invalid group data', group);
    return null;
  }

  const handleSupermarketPress = useCallback((item: any) => {
    // TODO: Implementar navegacion al supermercado
    console.log('Navigate to supermarket:', item.supermercado);
  }, []);

  return (
    <View
      style={styles.card}
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
    </View>
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
});
