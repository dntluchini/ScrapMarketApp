import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../../utils/productNameUtils';
import { GroupedProduct, Product, productGroupingService } from '../../services/productGroupingService';

interface ProductHeaderProps {
  group: GroupedProduct;
}

const normalizeWeight = (rawWeight?: string) => {
  if (!rawWeight) return null;
  const normalized = rawWeight.trim().toLowerCase();
  const match = normalized.match(/([\d.,]+)/);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (normalized.includes('kg')) return { value: numeric * 1000, unit: 'g' as const };
  if (normalized.includes('g') || normalized.includes('gr')) return { value: numeric, unit: 'g' as const };
  if (normalized.includes('ml')) return { value: numeric, unit: 'ml' as const };
  if (normalized.includes('lt') || normalized.includes(' l') || normalized.endsWith('l')) {
    return { value: numeric * 1000, unit: 'ml' as const };
  }
  return { value: numeric, unit: 'un' as const };
};

const getImageSource = (group: GroupedProduct): string | undefined => {
  const sources: Array<string | undefined> = [
    group.imageUrl,
    group.best_price?.imageUrl,
    group.products.find((item: Product) => !!item.imageUrl)?.imageUrl,
  ];

  return sources.find(Boolean);
};

const capitalizeWords = (text: string): string =>
  text
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');

export const ProductHeader = React.memo<ProductHeaderProps>(({ group }) => {
  const formattedName = useMemo(
    () => capitalizeWords(productGroupingService.formatProductNameWithBrand(group)),
    [group]
  );
  const productImage = useMemo(() => getImageSource(group), [group]);
  const weight = useMemo(() => normalizeWeight(group.exact_weight), [group.exact_weight]);
  const pricePerUnit = useMemo(() => {
    if (!weight || weight.unit === 'un') return null;
    const perUnit = group.min_price / weight.value;
    if (!Number.isFinite(perUnit) || perUnit <= 0) return null;
    const unitLabel = weight.unit === 'ml' ? 'ml' : 'g';
    return `${formatPrice(perUnit)} / ${unitLabel}`;
  }, [group.min_price, weight]);

  const rawBrand = group.brand ?? group.products[0]?.brand;
  const normalizedBrand = rawBrand?.trim();
  const showBrandBadge = Boolean(
    normalizedBrand && normalizedBrand.toLowerCase() !== 'sin marca'
  );
  const supermarketCount = group.total_supermarkets ?? group.products.length;
  const showRange = group.max_price && group.max_price !== group.min_price;

  return (
    <View style={styles.header}>
      <View style={styles.imageWrapper}>
        {productImage ? (
          <Image source={{ uri: productImage }} style={styles.productImage} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={28} color="#8c9aa5" />
          </View>
        )}
      </View>

      <View style={styles.badgesRow}>
        {showBrandBadge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {normalizedBrand}
            </Text>
          </View>
        ) : null}
        {weight ? (
          <View style={[styles.badge, styles.weightBadge]}>
            <Text style={[styles.badgeText, styles.weightBadgeText]} numberOfLines={1}>
              {weight.unit === 'un'
                ? `${weight.value}`
                : weight.unit === 'g'
                  ? `${Math.round(weight.value)} g`
                  : `${Math.round(weight.value)} ml`}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.price}>{formatPrice(group.min_price)}</Text>
      {pricePerUnit ? (
        <Text style={styles.secondaryText}>{pricePerUnit}</Text>
      ) : showRange ? (
        <Text style={styles.secondaryText}>
          {formatPrice(group.min_price)} - {formatPrice(group.max_price)}
        </Text>
      ) : null}

      <Text style={styles.productName} numberOfLines={2}>
        {formattedName}
      </Text>

      {supermarketCount > 0 ? (
        <Text style={styles.supermarketText}>
          en {supermarketCount} supermercado{supermarketCount === 1 ? '' : 's'}
        </Text>
      ) : null}
    </View>
  );
});

ProductHeader.displayName = 'ProductHeader';

const styles = StyleSheet.create({
  header: {
    alignItems: 'stretch',
    marginBottom: 16,
  },
  imageWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 12,
  },
  productImage: {
    width: '90%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '90%',
    height: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9e3eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f8fb',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#eef3ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#2b4cc2',
    fontSize: 11,
    fontWeight: '600',
  },
  weightBadge: {
    backgroundColor: '#2b4cc2',
  },
  weightBadgeText: {
    color: '#ffffff',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  productName: {
    marginTop: 8,
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 20,
    fontWeight: '600',
  },
  supermarketText: {
    marginTop: 6,
    fontSize: 12,
    color: '#4b5563',
  },
});
