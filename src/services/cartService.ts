import { Product } from './productGroupingService';

// Tipos para el carrito
export interface CartItem {
  product: Product;
  quantity: number;
  addedAt: string;
  productKey?: string;
}

export interface CartBySupermarket {
  supermarket: string;
  items: CartItem[];
  total: number;
  totalItems: number;
}

export interface Cart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  bySupermarket: CartBySupermarket[];
}

class CartService {
  private cart: CartItem[] = [];
  private readonly STORAGE_KEY = '@scrapmarket_cart';
  private listeners: (() => void)[] = [];

  // Suscribirse a cambios del carrito
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notificar a los suscriptores
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Cargar carrito desde almacenamiento local (futuro: AsyncStorage)
  async loadCart(): Promise<CartItem[]> {
    try {
      // TODO: Implementar con AsyncStorage cuando esté instalado
      // const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      // if (stored) {
      //   this.cart = JSON.parse(stored);
      // }
      return this.cart;
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  }

  // Guardar carrito en almacenamiento local
  async saveCart(): Promise<void> {
    try {
      // TODO: Implementar con AsyncStorage cuando esté instalado
      // await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  private normalizeValue(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    return trimmed.toLowerCase();
  }

  private resolveProductIdentifier(product: Product): string {
    const candidates = [
      product.canonid,
      product.ean,
      product.addToCartLink,
      product.sku,
      product.skuRef,
      product.url,
      product.imageUrl,
      `${product.canonname || 'producto'}-${product.exact_weight || ''}`,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeValue(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return (
      this.normalizeValue(`${product.canonname || 'producto'}-${product.precio}`) ||
      'producto-sin-identificador'
    );
  }

  private getProductKey(product: Product): string {
    const market = this.normalizeValue(product.supermercado) || 'supermercado';
    const identifier = this.resolveProductIdentifier(product);
    return `${market}::${identifier}`;
  }

  private ensureCartItemKey(cartItem: CartItem): string {
    if (!cartItem.productKey) {
      cartItem.productKey = this.getProductKey(cartItem.product);
    }
    return cartItem.productKey;
  }

  // Agregar producto al carrito
  async addToCart(product: Product, quantity: number = 1): Promise<void> {
    console.log('🛒 addToCart called:', product.canonname, product.supermercado, 'quantity:', quantity);
    console.log('🛒 Product addToCartLink:', product.addToCartLink);
    console.log('🛒 Full product object:', JSON.stringify(product, null, 2));

    const productKey = this.getProductKey(product);
    const existingItemIndex = this.cart.findIndex(
      item => this.ensureCartItemKey(item) === productKey
    );

    console.log('🛒 Existing item index:', existingItemIndex);

    if (existingItemIndex >= 0) {
      // Si ya existe, aumentar cantidad
      this.cart[existingItemIndex].quantity += quantity;
      console.log('🛒 Updated existing item, new quantity:', this.cart[existingItemIndex].quantity);
      // Preservar addToCartLink si el nuevo producto lo tiene y el existente no
      if (product.addToCartLink && !this.cart[existingItemIndex].product.addToCartLink) {
        this.cart[existingItemIndex].product.addToCartLink = product.addToCartLink;
        console.log('🛒 Updated addToCartLink for existing item:', product.addToCartLink);
      }
    } else {
      // Si no existe, agregar nuevo item
      this.cart.push({
        product: {
          ...product, // Asegurar que se copian todas las propiedades incluyendo addToCartLink
        },
        quantity,
        addedAt: new Date().toISOString(),
        productKey,
      });
      console.log('🛒 Added new item to cart, total items:', this.cart.length);
      console.log('🛒 New item addToCartLink:', this.cart[this.cart.length - 1].product.addToCartLink);
    }

    await this.saveCart();
    console.log('🛒 Cart saved, total items in cart:', this.cart.length);
    this.notifyListeners();
  }

  // Remover producto del carrito
  async removeFromCart(product: Product): Promise<void> {
    const productKey = this.getProductKey(product);
    this.cart = this.cart.filter(item => this.ensureCartItemKey(item) !== productKey);
    await this.saveCart();
    this.notifyListeners();
  }

  // Actualizar cantidad de un producto
  async updateQuantity(product: Product, quantity: number): Promise<void> {
    const productKey = this.getProductKey(product);
    const item = this.cart.find(item => this.ensureCartItemKey(item) === productKey);

    if (item) {
      if (quantity <= 0) {
        await this.removeFromCart(product);
      } else {
        item.quantity = quantity;
        await this.saveCart();
        this.notifyListeners();
      }
    }
  }

  // Obtener carrito completo con estadísticas
  getCart(): Cart {
    const bySupermarket = this.groupBySupermarket();
    const totalPrice = this.cart.reduce(
      (sum, item) => sum + (item.product.precio * item.quantity),
      0
    );

    return {
      items: this.cart,
      totalItems: this.cart.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice,
      bySupermarket,
    };
  }

  // Agrupar productos por supermercado
  private groupBySupermarket(): CartBySupermarket[] {
    const grouped: { [key: string]: CartItem[] } = {};

    this.cart.forEach(item => {
      const supermarket = item.product.supermercado;
      if (!grouped[supermarket]) {
        grouped[supermarket] = [];
      }
      grouped[supermarket].push(item);
    });

    return Object.entries(grouped).map(([supermarket, items]) => {
      const total = items.reduce((sum, item) => sum + (item.product.precio * item.quantity), 0);
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

      return {
        supermarket,
        items,
        total,
        totalItems,
      };
    });
  }

  // Limpiar carrito
  async clearCart(): Promise<void> {
    console.log('clearCart called, current cart length:', this.cart.length);
    this.cart = [];
    console.log('Cart cleared, new length:', this.cart.length);
    await this.saveCart();
    console.log('Cart saved');
    this.notifyListeners();
  }

  // Limpiar carrito de un supermercado específico
  async clearSupermarketCart(supermarket: string): Promise<void> {
    this.cart = this.cart.filter(item => item.product.supermercado !== supermarket);
    await this.saveCart();
    this.notifyListeners();
  }

  // Obtener cantidad total de items
  getTotalItems(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Verificar si un producto está en el carrito
  isInCart(product: Product): boolean {
    const productKey = this.getProductKey(product);
    return this.cart.some(item => this.ensureCartItemKey(item) === productKey);
  }

  // Obtener cantidad de un producto específico en el carrito
  getProductQuantity(product: Product): number {
    const productKey = this.getProductKey(product);
    const item = this.cart.find(item => this.ensureCartItemKey(item) === productKey);
    return item ? item.quantity : 0;
  }
}

export const cartService = new CartService();

