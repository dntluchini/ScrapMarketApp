import { useState, useEffect, useCallback } from 'react';
import { cartService, Cart } from '../services/cartService';

/**
 * Hook personalizado para manejar el estado del carrito
 * Proporciona el carrito actualizado y funciones para actualizarlo
 * Se actualiza automáticamente cuando cambia el carrito mediante listeners
 */
export function useCart() {
  const [cart, setCart] = useState<Cart>(cartService.getCart());
  const [totalItems, setTotalItems] = useState<number>(cartService.getTotalItems());

  const refreshCart = useCallback(() => {
    const updatedCart = cartService.getCart();
    const newTotalItems = cartService.getTotalItems();
    setCart(updatedCart);
    setTotalItems(newTotalItems);
  }, []);

  useEffect(() => {
    // Cargar carrito inicial
    cartService.loadCart().then(() => {
      refreshCart();
    });

    // Suscribirse a cambios del carrito
    const unsubscribe = cartService.subscribe(() => {
      refreshCart();
    });

    // También actualizar periódicamente como respaldo (cada 2 segundos)
    const interval = setInterval(() => {
      refreshCart();
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshCart]);

  return {
    cart,
    totalItems,
    refreshCart,
  };
}

