import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { cleanProductName, formatPrice } from '../../utils/productNameUtils';
import { GroupedProduct, productGroupingService } from '../../services/productGroupingService';

interface ProductHeaderProps {
  group: GroupedProduct;
}

/**
 * Componente optimizado para el header del producto
 * Memoizado para evitar re-renders innecesarios
 */
export const ProductHeader = React.memo<ProductHeaderProps>(({ group }) => {
  // Usar la función de formateo con marca
  const formattedName = productGroupingService.formatProductNameWithBrand(group);
  
  // Para productos populares, mostrar solo el precio más barato
  const isPopularProduct = group.products.length === 1;
  const priceRange = isPopularProduct
    ? formatPrice(group.min_price)
    : group.min_price === group.max_price
      ? formatPrice(group.min_price)
      : `${formatPrice(group.min_price)} - ${formatPrice(group.max_price)}`;

  return (
    <View style={styles.header}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {formattedName}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceRange}>
            {priceRange}
          </Text>
          {isPopularProduct && (
            <View style={styles.bestPriceBadge}>
              <Text style={styles.bestPriceText}>MEJOR PRECIO</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.priceInfo}>
        <Text style={styles.minPriceLabel}>Min:</Text>
        <Text style={styles.minPrice}>
          {formatPrice(group.min_price)}
        </Text>
      </View>
    </View>
  );
});

ProductHeader.displayName = 'ProductHeader';

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  bestPriceBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  bestPriceText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  priceInfo: {
    alignItems: 'flex-end',
    flexShrink: 0,
    justifyContent: 'flex-start',
    marginTop: 0,
  },
  minPriceLabel: {
    fontSize: 12,
    color: '#CCCCCC',
    marginBottom: 2,
  },
  minPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
});




