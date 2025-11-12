import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPrice } from '../../utils/productNameUtils';
import { cartService } from '../../services/cartService';
import { Product, productGroupingService } from '../../services/productGroupingService';

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
  
  const [isInCart, setIsInCart] = useState(cartService.isInCart(item.canonid, item.supermercado));
  const [cartQuantity, setCartQuantity] = useState(cartService.getProductQuantity(item.canonid, item.supermercado));
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Actualizar estado cuando cambie el carrito
  useEffect(() => {
    const checkCart = () => {
      const inCart = cartService.isInCart(item.canonid, item.supermercado);
      const quantity = cartService.getProductQuantity(item.canonid, item.supermercado);
      setIsInCart(inCart);
      setCartQuantity(quantity);
    };
    
    checkCart();
    // Re-verificar periódicamente (podría mejorarse con un sistema de eventos)
    const interval = setInterval(checkCart, 1000);
    return () => clearInterval(interval);
  }, [item.canonid, item.supermercado]);

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

  const handleAddToCart = () => {
    if (isProcessing) {
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmAdd = async () => {
    setIsProcessing(true);
    setShowConfirmModal(false);
    
    try {
      console.log('🛒 SupermarketItem - Adding to cart:', {
        name: item.canonname,
        supermarket: item.supermercado,
        addToCartLink: item.addToCartLink,
        fullItem: item,
      });
      
      await cartService.addToCart(item, 1);
      setIsInCart(true);
      setCartQuantity(1);
      onCartUpdate?.();
      setShowSuccessModal(true);
      setIsProcessing(false);
      
      // Cerrar el modal de éxito después de 2 segundos
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setIsProcessing(false);
      Alert.alert('Error', 'No se pudo agregar el producto al carrito');
    }
  };

  const handleCancelAdd = () => {
    setShowConfirmModal(false);
    setIsProcessing(false);
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
        await cartService.removeFromCart(item.canonid, item.supermercado);
        setIsInCart(false);
        setCartQuantity(0);
      } else {
        await cartService.updateQuantity(item.canonid, item.supermercado, cartQuantity - 1);
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
                style={styles.cartButton}
                onPress={handleAddToCart}
              >
                <Ionicons name="add" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.verButton} onPress={handleVerPress}>
              <Text style={styles.verButtonText}>Ver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal de confirmación */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelAdd}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar al carrito</Text>
              <TouchableOpacity onPress={handleCancelAdd} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalProductName}>
                {productGroupingService.formatProductNameWithBrand(item)}
              </Text>
              <Text style={styles.modalSupermarket}>Supermercado: {item.supermercado}</Text>
              <Text style={styles.modalPrice}>Precio: {formatPrice(item.precio)}</Text>
              <Text style={styles.modalQuestion}>
                ¿Deseas agregar este producto al carrito?
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelAdd}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmAdd}
              >
                <Text style={styles.modalButtonConfirmText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.successModalContent]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>¡Producto agregado!</Text>
            <Text style={styles.successMessage}>El producto se ha agregado al carrito correctamente</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Estilos para el Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  modalSupermarket: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 16,
  },
  modalQuestion: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonCancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para el modal de éxito
  successModalContent: {
    alignItems: 'center',
    padding: 32,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
