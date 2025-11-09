import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { formatPrice } from '../../utils/productNameUtils';
import { GroupedProduct, productGroupingService } from '../../services/productGroupingService';

interface ProductHeaderProps {
  group: GroupedProduct;
}

export const ProductHeader = React.memo<ProductHeaderProps>(({ group }) => {
  const formattedName = productGroupingService.formatProductNameWithBrand(group);
  const productImage =
    group.imageUrl ||
    group.best_price?.imageUrl ||
    group.products.find(product => product.imageUrl)?.imageUrl;

  const isPopularProduct = group.products.length === 1;
  const priceRange = isPopularProduct
    ? formatPrice(group.min_price)
    : group.min_price === group.max_price
      ? formatPrice(group.min_price)
      : `${formatPrice(group.min_price)} - ${formatPrice(group.max_price)}`;

  return (
    <View style={styles.header}>
      {productImage ? (
        <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="contain" />
      ) : null}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {formattedName}
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.priceRange}>{priceRange}</Text>
          {isPopularProduct && (
            <View style={styles.bestPriceBadge}>
              <Text style={styles.bestPriceText}>MEJOR PRECIO</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.priceInfo}>
        <Text style={styles.minPriceLabel}>Min:</Text>
        <Text style={styles.minPrice}>{formatPrice(group.min_price)}</Text>
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
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#1F1F1F',
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
