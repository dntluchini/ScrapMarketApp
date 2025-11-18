import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../../utils/productNameUtils';
import { cartService } from '../../services/cartService';
import { Product } from '../../services/productGroupingService';

interface SupermarketItemProps {
  item: Product;
  onPress?: () => void;
  onCartUpdate?: () => void;
}

/**
 * Componente optimizado para mostrar un item de supermercado
 * Memoizado para evitar re-renders innecesarios
 */
export const SupermarketItem = React.memo<SupermarketItemProps>(({ item, onPress, onCartUpdate }) => {
  // Log para verificar qué recibe el componente
  React.useEffect(() => {
    console.log('🛒 SupermarketItem received item:', {
      canonname: item.canonname,
      supermercado: item.supermercado,
      hasAddToCartLink: !!item.addToCartLink,
      addToCartLink: item.addToCartLink,
      allKeys: Object.keys(item)
    });
  }, [item]);
  
  const [isInCart, setIsInCart] = useState(cartService.isInCart(item));
  const [cartQuantity, setCartQuantity] = useState(cartService.getProductQuantity(item));
  const [isProcessing, setIsProcessing] = useState(false);

  // Actualizar estado cuando cambie el carrito
  useEffect(() => {
    const checkCart = () => {
      const inCart = cartService.isInCart(item);
      const quantity = cartService.getProductQuantity(item);
      setIsInCart(inCart);
      setCartQuantity(quantity);
    };
    
    checkCart();
    // Re-verificar periódicamente (podría mejorarse con un sistema de eventos)
    const interval = setInterval(checkCart, 1000);
    return () => clearInterval(interval);
  }, [item]);

  const handleVerPress = async () => {
    if (!item.url) {
      Alert.alert('Informaci\u00F3n', 'No hay enlace disponible para este producto');
      onPress?.();
      return;
    }

    try {
      const supported = await Linking.canOpenURL(item.url);

      if (supported) {
        await Linking.openURL(item.url);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }

    onPress?.();
  };

  const handleAddToCart = async () => {
    if (isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      await cartService.addToCart(item, 1);
      setIsInCart(true);
      setCartQuantity(prev => (prev > 0 ? prev + 1 : 1));
      onCartUpdate?.();
    } catch (error) {
      console.error('Error adding to cart:', error);
      Alert.alert('Error', 'No se pudo agregar el producto al carrito');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIncreaseQuantity = async () => {
    try {
      await cartService.addToCart(item, 1);
      setCartQuantity(prev => prev + 1);
      onCartUpdate?.();
    } catch (error) {
      console.error('Error increasing quantity:', error);
    }
  };

  const handleDecreaseQuantity = async () => {
    try {
      if (cartQuantity <= 1) {
        await cartService.removeFromCart(item);
        setIsInCart(false);
        setCartQuantity(0);
      } else {
        await cartService.updateQuantity(item, cartQuantity - 1);
        setCartQuantity(prev => prev - 1);
      }
      onCartUpdate?.();
    } catch (error) {
      console.error('Error decreasing quantity:', error);
    }
  };

  return (
    <>
      <View style={styles.supermarketItem}>
        <View style={styles.supermarketInfo}>
          <Text style={styles.supermarketName}>{item.supermercado || 'Sin nombre'}</Text>
          <Text style={styles.supermarketPrice}>{formatPrice(item.precio)}</Text>
        </View>
        <View style={styles.supermarketStatus}>
          <Text
            style={[
              styles.stock,
              { color: item.stock ? '#047857' : '#b91c1c' },
            ]}
          >
            {item.stock ? 'En stock' : 'Sin stock'}
          </Text>
          <View style={styles.actionButtons}>
            {isInCart ? (
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={handleDecreaseQuantity}
                >
                  <Ionicons name="remove" size={18} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{cartQuantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={handleIncreaseQuantity}
                >
                  <Ionicons name="add" size={18} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.cartButton, isProcessing && styles.cartButtonDisabled]}
                onPress={handleAddToCart}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <Ionicons name="add" size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.verButton} onPress={handleVerPress}>
              <Text style={styles.verButtonText}>Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

    </>
  );
});

SupermarketItem.displayName = 'SupermarketItem';

const styles = StyleSheet.create({
  supermarketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  supermarketPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  supermarketStatus: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButtonDisabled: {
    opacity: 0.6,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
    minWidth: 24,
    textAlign: 'center',
  },
  verButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
