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
  const supermarketCount = group.total_supermarkets ?? group.products.length;

  return (
    <View style={styles.footer}>
      <Text style={styles.metaText}>
        Actualizado en {supermarketCount} supermercado{supermarketCount === 1 ? '' : 's'}
      </Text>
      <View
        style={[
          styles.stockIndicator,
          group.has_stock ? styles.stockAvailable : styles.stockUnavailable,
        ]}
      >
        <Text
          style={[
            styles.stockText,
            group.has_stock ? styles.stockAvailableText : styles.stockUnavailableText,
          ]}
        >
          {group.has_stock ? 'Disponible' : 'Sin stock'}
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
  metaText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  stockIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  stockAvailable: {
    backgroundColor: '#ecfdf5',
  },
  stockUnavailable: {
    backgroundColor: '#fef2f2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockAvailableText: {
    color: '#047857',
  },
  stockUnavailableText: {
    color: '#b91c1c',
  },
});




