import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GroupedProduct, Product } from '../services/productGroupingService';
import { formatPrice } from '../utils/productNameUtils';

interface PopularProductCardProps {
  product: GroupedProduct;
  onPress?: (product: GroupedProduct) => void;
  onAdd?: (product: GroupedProduct) => void;
}

type ParsedWeight = {
  value: number;
  unit: 'g' | 'kg' | 'ml' | 'l' | 'un';
};

const normalizeWeight = (rawWeight?: string): ParsedWeight | null => {
  if (!rawWeight) return null;
  const normalized = rawWeight.trim().toLowerCase();
  const match = normalized.match(/([\d.,]+)/);
  if (!match) return null;
  const numeric = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (normalized.includes('kg')) return { value: numeric * 1000, unit: 'g' };
  if (normalized.includes('g') || normalized.includes('gr')) return { value: numeric, unit: 'g' };
  if (normalized.includes('ml')) return { value: numeric, unit: 'ml' };
  if (normalized.includes('lt') || normalized.includes(' l') || normalized.endsWith('l')) return { value: numeric * 1000, unit: 'ml' };
  return { value: numeric, unit: 'un' };
};

const getImageSource = (product: GroupedProduct): string | undefined => {
  const sources: Array<string | undefined> = [
    product.imageUrl,
    product.best_price?.imageUrl,
    product.products.find((item: Product) => !!item.imageUrl)?.imageUrl,
    // Fallback: buscar en cualquier producto del array
    ...product.products.map(item => item.imageUrl).filter(Boolean),
  ];
  const found = sources.find(Boolean);
  
  // Debug: Log image search for first product
  if (!found && product.display_name) {
    console.log('⚠️ [PopularProductCard] No image found for:', {
      display_name: product.display_name,
      productImageUrl: product.imageUrl,
      bestPriceImageUrl: product.best_price?.imageUrl,
      productsWithImages: product.products.filter(p => p.imageUrl).map(p => ({ supermercado: p.supermercado, imageUrl: p.imageUrl })),
    });
  }
  
  return found;
};

const capitalizeWords = (text: string): string =>
  text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

// Función para capitalizar marcas correctamente
// Maneja artículos y preposiciones (LA, DE, LOS, etc.)
const capitalizeBrand = (brand: string): string => {
  if (!brand) return '';
  
  // Palabras que deben permanecer en minúsculas (excepto si son la primera palabra)
  const lowercaseWords = ['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'en', 'con', 'por', 'para'];
  
  const words = brand.toLowerCase().trim().split(/\s+/);
  if (words.length === 0) return '';
  
  return words
    .map((word, index) => {
      // Si es la primera palabra, siempre capitalizar
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Si es una palabra que debe estar en minúsculas, mantenerla así
      if (lowercaseWords.includes(word)) {
        return word;
      }
      // Para el resto, capitalizar
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const PopularProductCard: React.FC<PopularProductCardProps> = ({ product, onPress, onAdd }) => {
  const weight = useMemo(() => normalizeWeight(product.exact_weight), [product.exact_weight]);
  const pricePerUnit = useMemo(() => {
    if (!weight || weight.unit === 'un') return null;
    const perUnit = product.min_price / weight.value;
    if (!Number.isFinite(perUnit) || perUnit <= 0) return null;
    const unitLabel = weight.unit === 'ml' ? 'ml' : 'g';
    return `${formatPrice(perUnit)} / ${unitLabel}`;
  }, [product.min_price, weight]);

  const mainImage = getImageSource(product);
  const supermarketCount = product.total_supermarkets ?? product.products.length;

  const handlePress = () => {
    onPress?.(product);
  };

  const handleAdd = (event: any) => {
    event.stopPropagation();
    if (onAdd) {
      onAdd(product);
    } else {
      onPress?.(product);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.card} 
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrapper}>
        {mainImage ? (
          <Image source={{ uri: mainImage }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={28} color="#8c9aa5" />
          </View>
        )}
        <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.7}>
          <Ionicons name="add" size={18} color="#0cb055" />
        </TouchableOpacity>
      </View>

      <View style={styles.badgesRow}>
        {product.brand ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{capitalizeBrand(product.brand)}</Text>
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

      <Text style={styles.price}>{formatPrice(product.min_price)}</Text>
      {pricePerUnit ? <Text style={styles.secondaryText}>{pricePerUnit}</Text> : null}

      <Text style={styles.description} numberOfLines={2}>
        {capitalizeWords(product.display_name)}
      </Text>

      {supermarketCount > 0 ? (
        <Text style={styles.supermarketText} numberOfLines={1}>
          en {supermarketCount} supermercado{supermarketCount === 1 ? '' : 's'}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 220,
    height: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginRight: 16,
    shadowColor: '#0d2233',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    justifyContent: 'space-between',
  },
  imageWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    height: 110,
    marginBottom: 12,
  },
  image: {
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
  addButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0cb055',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
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
  description: {
    marginTop: 8,
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 18,
    fontWeight: '500',
  },
  supermarketText: {
    marginTop: 6,
    fontSize: 12,
    color: '#4b5563',
  },
});

export default PopularProductCard;
