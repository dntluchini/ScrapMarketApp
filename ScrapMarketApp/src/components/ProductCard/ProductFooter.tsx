import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GroupedProduct } from '../../services/productGroupingService';

interface ProductFooterProps {
  group: GroupedProduct;
}

/**
 * Componente optimizado para el footer del producto
 * Memoizado para evitar re-renders innecesarios
 */
export const ProductFooter = React.memo<ProductFooterProps>(({ group }) => {
  return (
    <View style={styles.footer}>
      <View style={[
        styles.stockIndicator, 
        { backgroundColor: group.has_stock ? '#4CAF50' : '#F44336' }
      ]}>
        <Text style={styles.stockText}>
          {group.has_stock ? 'Disponible' : 'Sin Stock'}
        </Text>
      </View>
    </View>
  );
});

ProductFooter.displayName = 'ProductFooter';

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});




