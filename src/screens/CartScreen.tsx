import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Linking,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { cartService, CartBySupermarket, CartItem } from '../services/cartService';
import { formatPrice } from '../utils/productNameUtils';
import { useCart } from '../hooks/useCart';
import { useFocusEffect } from '@react-navigation/native';
import { productGroupingService } from '../services/productGroupingService';

// Función para capitalizar palabras
const capitalizeWords = (text: string): string =>
  text
    .split(' ')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ');

export default function CartScreen({ navigation }: any) {
  const { cart, refreshCart } = useCart();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingSupermarket, setProcessingSupermarket] = useState<string | null>(null);
  
  // Estados para modales de confirmación
  const [showRemoveItemModal, setShowRemoveItemModal] = useState(false);
  const [showClearSupermarketModal, setShowClearSupermarketModal] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const [supermarketToClear, setSupermarketToClear] = useState<string | null>(null);

  // Actualizar carrito cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      refreshCart();
    }, [refreshCart])
  );

  const loadCart = useCallback(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await cartService.loadCart();
    loadCart();
    setIsRefreshing(false);
  }, [loadCart]);

  const handleRemoveItem = useCallback((cartItem: CartItem) => {
    setItemToRemove(cartItem);
    setShowRemoveItemModal(true);
  }, []);

  const confirmRemoveItem = useCallback(async () => {
    if (itemToRemove) {
      await cartService.removeFromCart(itemToRemove.product);
      loadCart();
      setShowRemoveItemModal(false);
      setItemToRemove(null);
    }
  }, [itemToRemove, loadCart]);

  const handleUpdateQuantity = useCallback(
    async (cartItem: CartItem, newQuantity: number) => {
      await cartService.updateQuantity(cartItem.product, newQuantity);
      loadCart();
    },
    [loadCart]
  );

  const handleClearSupermarket = useCallback((supermarket: string) => {
    setSupermarketToClear(supermarket);
    setShowClearSupermarketModal(true);
  }, []);

  const confirmClearSupermarket = useCallback(async () => {
    if (supermarketToClear) {
      await cartService.clearSupermarketCart(supermarketToClear);
      loadCart();
      setShowClearSupermarketModal(false);
      setSupermarketToClear(null);
    }
  }, [supermarketToClear, loadCart]);

  // Función para modificar el parámetro qty en una URL de add_to_cart_link
  const updateCartLinkQuantity = (cartLink: string, quantity: number): string => {
    if (!cartLink) return cartLink;

    try {
      const url = new URL(cartLink);
      // Actualizar el parámetro qty
      url.searchParams.set('qty', quantity.toString());
      return url.toString();
    } catch (error) {
      console.error('Error updating cart link quantity:', error);
      // Si falla, intentar reemplazo simple
      return cartLink.replace(/[?&]qty=\d+/, `qty=${quantity}`).replace(/qty=\d+/, `qty=${quantity}`);
    }
  };

  const buildCombinedAddToCartLink = (items: CartItem[]): string | null => {
    if (items.length === 0) return null;
    try {
      const links = items
        .map(item => item.product.addToCartLink)
        .filter((link): link is string => Boolean(link));
      if (links.length !== items.length) {
        return null;
      }

      const firstUrl = new URL(links[0]);
      const samePath = links.every(link => {
        const parsed = new URL(link);
        return parsed.origin === firstUrl.origin && parsed.pathname === firstUrl.pathname;
      });

      if (!samePath) {
        return null;
      }

      const combined = new URL(firstUrl.origin + firstUrl.pathname);

      items.forEach(item => {
        const link = item.product.addToCartLink!;
        const parsed = new URL(link);
        const params = parsed.searchParams;

        const sku =
          params.get('sku') ||
          item.product.sku ||
          item.product.skuRef ||
          item.product.canonid ||
          item.product.ean;

        if (!sku) {
          return;
        }

        const seller = params.get('seller') || '1';
        const sc = params.get('sc') || params.get('salesChannel') || '1';
        const cv = params.get('cv') || '_';
        const price =
          params.get('price') ||
          (item.product.precio ? Math.round(item.product.precio * 100).toString() : '0');

        combined.searchParams.append('sku', sku);
        combined.searchParams.append('qty', String(item.quantity));
        combined.searchParams.append('seller', seller);
        combined.searchParams.append('sc', sc);
        combined.searchParams.append('price', price);
        combined.searchParams.append('cv', cv);
      });

      if (combined.searchParams.getAll('sku').length === 0) {
        return null;
      }

      return combined.toString();
    } catch (error) {
      console.error('Error building combined addToCart link:', error);
      return null;
    }
  };

  // Función para construir URL del carrito basándose en la URL del producto
  const buildCartUrl = (productUrl: string, supermarket: string): string | null => {
    if (!productUrl) return null;

    try {
      const url = new URL(productUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      
      // Patrones comunes de URLs de carrito para diferentes supermercados
      const cartUrls: { [key: string]: string } = {
        'vea': `${baseUrl}/carrito`,
        'disco': `${baseUrl}/carrito`,
        'jumbo': `${baseUrl}/carrito`,
        'coto': `${baseUrl}/carrito`,
        'carrefour': `${baseUrl}/carrito`,
        'walmart': `${baseUrl}/carrito`,
      };

      const supermarketLower = supermarket.toLowerCase();
      if (cartUrls[supermarketLower]) {
        return cartUrls[supermarketLower];
      }

      // Fallback: intentar con /cart o /carrito
      return `${baseUrl}/carrito`;
    } catch (error) {
      console.error('Error building cart URL:', error);
      return null;
    }
  };

  const handleAddToSupermarketCart = useCallback(
    async (supermarket: string, items: CartItem[]) => {
      if (processingSupermarket) {
        if (processingSupermarket === supermarket) {
          Alert.alert('Espera', 'Ya se están agregando los productos de este supermercado.');
        } else {
          Alert.alert(
            'Espera',
            `Estamos agregando productos de ${processingSupermarket}. Intenta nuevamente en unos segundos.`
          );
        }
        return;
      }

      setProcessingSupermarket(supermarket);
      try {
        console.log('🛒 handleAddToSupermarketCart called for:', supermarket);
        console.log('🛒 Items count:', items.length);
        console.log('🛒 Items with addToCartLink:', items.filter(item => item.product.addToCartLink).length);

        const itemsWithLinks = items.filter(item => item.product.addToCartLink);

        items.forEach((item, index) => {
          console.log(`🛒 Item ${index}:`, {
            name: item.product.canonname,
            supermarket: item.product.supermercado,
            hasAddToCartLink: !!item.product.addToCartLink,
            addToCartLink: item.product.addToCartLink,
            quantity: item.quantity,
          });
        });

        if (itemsWithLinks.length === 0) {
          const firstItem = items[0];
          if (firstItem?.product.url) {
            const cartUrl = buildCartUrl(firstItem.product.url, supermarket);
            if (cartUrl) {
              try {
                const supported = await Linking.canOpenURL(cartUrl);
                if (supported) {
                  await Linking.openURL(cartUrl);
                  return;
                }
              } catch (error) {
                console.error('Error opening cart URL:', error);
              }
            }
          }

          Alert.alert(
            'Información',
            `No hay enlace disponible para agregar productos al carrito de ${supermarket}.`
          );
          return;
        }

        if (itemsWithLinks.length > 1) {
          const combinedLink = buildCombinedAddToCartLink(itemsWithLinks);
          if (combinedLink) {
            console.log('🛒 Opening combined cart URL:', combinedLink);
            try {
              const supported = await Linking.canOpenURL(combinedLink);
              if (supported) {
                await Linking.openURL(combinedLink);
                Alert.alert(
                  'Productos agregados',
                  `Se abrió el carrito con ${itemsWithLinks.length} productos de ${supermarket}.`
                );
                return;
              }
            } catch (error) {
              console.error('🛒 Error opening combined cart link:', error);
            }
          }
        }

        const failedItems: string[] = [];
        const addedItems: string[] = [];

        for (const item of itemsWithLinks) {
          const cartUrl = updateCartLinkQuantity(item.product.addToCartLink!, item.quantity);
          console.log('🛒 Opening cart URL:', cartUrl);
          try {
            const supported = await Linking.canOpenURL(cartUrl);
            if (supported) {
              await Linking.openURL(cartUrl);
              addedItems.push(item.product.canonname || item.product.canonid || 'Producto');
              await new Promise(resolve => setTimeout(resolve, 400));
            } else {
              console.warn('🛒 URL not supported:', cartUrl);
              failedItems.push(item.product.canonname || item.product.canonid || 'Producto');
            }
          } catch (error) {
            console.error('🛒 Error opening cart link:', error);
            failedItems.push(item.product.canonname || item.product.canonid || 'Producto');
          }
        }

        const ensureCartUrl = (link: string) => {
          try {
            const url = new URL(link);
            return `${url.protocol}//${url.host}/checkout/#/cart`;
          } catch {
            return null;
          }
        };

        const fallbackCartUrl =
          itemsWithLinks[0].product.url
            ? buildCartUrl(itemsWithLinks[0].product.url!, supermarket)
            : null;
        const finalCartUrl = ensureCartUrl(itemsWithLinks[0].product.addToCartLink!) || fallbackCartUrl;

        if (finalCartUrl) {
          try {
            const supported = await Linking.canOpenURL(finalCartUrl);
            if (supported) {
              await Linking.openURL(finalCartUrl);
            }
          } catch (error) {
            console.error('🛒 Error opening final cart URL:', error);
          }
        }

        if (addedItems.length > 0) {
          Alert.alert(
            'Productos agregados',
            `Se intentó agregar ${addedItems.length} producto${addedItems.length !== 1 ? 's' : ''} de ${supermarket}.`
          );
        }

        if (failedItems.length > 0) {
          Alert.alert(
            'No se pudieron abrir algunos enlaces',
            `Productos sin enlace válido: ${failedItems.join(', ')}`
          );
        }
      } finally {
        setProcessingSupermarket(null);
      }
    },
    [buildCartUrl, processingSupermarket, updateCartLinkQuantity]
  );

  const handleClearAll = useCallback(() => {
    if (cart.items.length === 0) {
      return;
    }
    setShowClearAllModal(true);
  }, [cart.items.length]);

  const confirmClearAll = useCallback(async () => {
    try {
      await cartService.clearCart();
      loadCart();
      setShowClearAllModal(false);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  }, [loadCart]);

  const renderCartItem = useCallback(
    ({ item }: { item: CartItem }) => (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={2}>
            {capitalizeWords(productGroupingService.formatProductNameWithBrand(item.product))}
          </Text>
          <Text style={styles.cartItemSupermarket}>{item.product.supermercado}</Text>
          <Text style={styles.cartItemPrice}>
            {formatPrice(item.product.precio)} c/u
          </Text>
        </View>
        <View style={styles.cartItemActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(
                item,
                item.quantity - 1
              )}
            >
              <Ionicons name="remove" size={18} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => handleUpdateQuantity(
                item,
                item.quantity + 1
              )}
            >
              <Ionicons name="add" size={18} color="#007AFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.cartItemTotal}>
            {formatPrice(item.product.precio * item.quantity)}
          </Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleRemoveItem, handleUpdateQuantity]
  );

  const renderSupermarketGroup = useCallback(
    ({ item: group }: { item: CartBySupermarket }) => {
      const isProcessing = processingSupermarket === group.supermarket;
      return (
      <View style={styles.supermarketGroup}>
        <View style={styles.supermarketHeader}>
          <View style={styles.supermarketHeaderInfo}>
            <Text style={styles.supermarketName}>{group.supermarket}</Text>
            <Text style={styles.supermarketStats}>
              {group.totalItems} producto{group.totalItems !== 1 ? 's' : ''} • {formatPrice(group.total)}
            </Text>
          </View>
          <View style={styles.supermarketActions}>
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                isProcessing && styles.addToCartButtonDisabled,
              ]}
              onPress={() => handleAddToSupermarketCart(group.supermarket, group.items)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="cart" size={18} color="#FFFFFF" />
                  <Text style={styles.addToCartButtonText}>Agregar al carrito</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => handleClearSupermarket(group.supermarket)}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={group.items}
          renderItem={renderCartItem}
          keyExtractor={(item) => item.productKey || `${item.product.canonid}_${item.product.supermercado}_${item.addedAt}`}
          scrollEnabled={false}
        />
      </View>
    );
    },
    [renderCartItem, handleAddToSupermarketCart, handleClearSupermarket, processingSupermarket]
  );

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptySubtitle}>
            Agrega productos desde la búsqueda para comenzar
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Carrito de Compras</Text>
          <Text style={styles.headerSubtitle}>
            {cart.totalItems} producto{cart.totalItems !== 1 ? 's' : ''} • {formatPrice(cart.totalPrice)}
          </Text>
        </View>
        {cart.items.length > 0 && (
          <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAll}>
            <Text style={styles.clearAllButtonText}>Vaciar carrito</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={cart.bySupermarket}
        renderItem={renderSupermarketGroup}
        keyExtractor={(item) => item.supermarket}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.footerTotal}>
              <Text style={styles.footerTotalLabel}>Total</Text>
              <Text style={styles.footerTotalPrice}>{formatPrice(cart.totalPrice)}</Text>
            </View>
            <Text style={styles.footerNote}>
              Los precios pueden variar. Verifica en el sitio del supermercado antes de comprar.
            </Text>
          </View>
        }
      />

      {/* Modal de confirmación para eliminar producto */}
      <Modal
        visible={showRemoveItemModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowRemoveItemModal(false);
          setItemToRemove(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Eliminar producto</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRemoveItemModal(false);
                  setItemToRemove(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalQuestion}>
                ¿Estás seguro de que quieres eliminar este producto del carrito?
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowRemoveItemModal(false);
                  setItemToRemove(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmRemoveItem}
              >
                <Text style={styles.modalButtonConfirmText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para limpiar supermercado */}
      <Modal
        visible={showClearSupermarketModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowClearSupermarketModal(false);
          setSupermarketToClear(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Limpiar carrito</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowClearSupermarketModal(false);
                  setSupermarketToClear(null);
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalQuestion}>
                ¿Estás seguro de que quieres eliminar todos los productos de {supermarketToClear}?
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowClearSupermarketModal(false);
                  setSupermarketToClear(null);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmClearSupermarket}
              >
                <Text style={styles.modalButtonConfirmText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmación para vaciar todo el carrito */}
      <Modal
        visible={showClearAllModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearAllModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vaciar carrito</Text>
              <TouchableOpacity
                onPress={() => setShowClearAllModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalQuestion}>
                ¿Estás seguro de que quieres eliminar todos los productos del carrito?
              </Text>
              <Text style={styles.modalSubtext}>
                Se eliminarán {cart.totalItems} producto{cart.totalItems !== 1 ? 's' : ''}.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowClearAllModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={confirmClearAll}
              >
                <Text style={styles.modalButtonDangerText}>Vaciar carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  clearAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearAllButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  supermarketGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supermarketHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  supermarketHeaderInfo: {
    marginBottom: 12,
  },
  supermarketName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  supermarketStats: {
    fontSize: 14,
    color: '#6b7280',
  },
  supermarketActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  addToCartButtonDisabled: {
    opacity: 0.6,
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    padding: 10,
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cartItemSupermarket: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#6b7280',
  },
  cartItemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  removeButton: {
    padding: 4,
  },
  // Estilos para modales
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
  modalQuestion: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
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
  modalButtonDanger: {
    backgroundColor: '#ef4444',
  },
  modalButtonDangerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  footerTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  footerTotalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
  },
  footerNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
