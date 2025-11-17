# 🛒 Sistema de Carrito de Compras - ScrapMarket App

## Versión: v1.4.0-beta
**Última actualización:** 12 de Noviembre, 2025

---

## 📋 Índice

1. [Resumen](#resumen)
2. [Arquitectura](#arquitectura)
3. [Componentes Principales](#componentes-principales)
4. [Flujo de Datos](#flujo-de-datos)
5. [Integración con Supermercados](#integración-con-supermercados)
6. [Implementación Técnica](#implementación-técnica)
7. [Mejoras Futuras](#mejoras-futuras)

---

## 🎯 Resumen

El sistema de carrito de compras permite a los usuarios:
- ✅ Agregar productos de diferentes supermercados
- ✅ Gestionar cantidades con controles intuitivos (+/-)
- ✅ Ver el carrito agrupado por supermercado
- ✅ Redirigir directamente a la web del supermercado con la cantidad correcta
- ✅ Visualizar el total de productos en un badge animado
- ✅ Confirmar acciones destructivas con modales personalizados y manejar altas de forma inline sin fricción
- ✅ Agregar productos desde Search y desde el modal de populares con cantidades sincronizadas al `cartService`

---

## 🏗️ Arquitectura

### Patrón Observer/Listener
El sistema utiliza un patrón observer para garantizar reactividad en tiempo real:

```typescript
// cartService.ts
private listeners: (() => void)[] = [];

subscribe(listener: () => void): () => void {
  this.listeners.push(listener);
  return () => {
    this.listeners = this.listeners.filter(l => l !== listener);
  };
}

private notifyListeners(): void {
  this.listeners.forEach(listener => listener());
}
```

### Flujo de Estado
```
Usuario → Acción → CartService → notifyListeners() → useCart Hook → Componentes UI
```

---

## 📦 Componentes Principales

### 1. **CartService** (`src/services/cartService.ts`)
**Responsabilidad:** Gestión central del estado del carrito

**Métodos principales:**
- `addToCart(product, quantity)` - Agregar producto
- `removeFromCart(productId)` - Eliminar producto
- `updateQuantity(productId, quantity)` - Actualizar cantidad
- `clearCart()` - Vaciar todo el carrito
- `clearSupermarketCart(supermarket)` - Vaciar carrito de un supermercado
- `getCart()` - Obtener estado actual
- `getCartGroupedBySupermarket()` - Obtener agrupado
- `getTotalItems()` - Obtener total de productos
- `subscribe(listener)` - Suscribirse a cambios

**Estructura de datos:**
```typescript
interface CartItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  quantity: number;
  supermarket: string;
  imageUrl?: string;
  addToCartLink?: string;
}
```

---

### 2. **CartScreen** (`src/screens/CartScreen.tsx`)
**Responsabilidad:** Vista principal del carrito

**Características:**
- ✅ Agrupación automática por supermercado
- ✅ Controles de cantidad por producto
- ✅ Cálculo de subtotales por supermercado
- ✅ Botón "Agregar al carrito" que redirige a la web del supermercado
- ✅ Modales de confirmación para acciones destructivas
- ✅ Capitalización correcta de nombres de productos

**Modales implementados:**
1. **Confirmación de eliminación de producto**
2. **Confirmación de vaciado por supermercado**
3. **Confirmación de vaciado total**

---

### 3. **useCart Hook** (`src/hooks/useCart.ts`)
**Responsabilidad:** Proporcionar acceso reactivo al carrito

**Implementación:**
```typescript
export const useCart = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);

  const refreshCart = useCallback(() => {
    const currentCart = cartService.getCart();
    setCart(currentCart);
    setTotalItems(cartService.getTotalItems());
  }, []);

  useEffect(() => {
    refreshCart();
    const unsubscribe = cartService.subscribe(refreshCart);
    return unsubscribe;
  }, [refreshCart]);

  return { cart, totalItems, refreshCart };
};
```

**Estrategia de actualización:**
1. Suscripción al servicio (principal)
2. Fallback con `setInterval` (backup, cada 500ms)
3. Refresh manual cuando la pantalla gana foco

---

### 4. **AnimatedCartBadge** (`src/components/AnimatedCartBadge.tsx`)
**Responsabilidad:** Badge animado del carrito en la navegación

**Animación:**
- ✅ Bounce effect cuando cambia el número
- ✅ Solo anima el texto, no el fondo
- ✅ Duración: 600ms
- ✅ Escalado: 1.0 → 1.5 → 1.0

```typescript
const animateBadge = () => {
  scaleAnim.setValue(1);
  Animated.sequence([
    Animated.timing(scaleAnim, {
      toValue: 1.5,
      duration: 150,
      useNativeDriver: true,
    }),
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }),
  ]).start();
};
```

---

### 5. **SupermarketItem** (`src/components/ProductCard/SupermarketItem.tsx`)
**Responsabilidad:** Card de producto con integración al carrito

**Características:**
- ✅ Botón "+" que se desactiva y muestra spinner mientras `cartService.addToCart` procesa la primera adición
- ✅ Controles +/- inline con sincronización inmediata del contador cuando el producto ya está en el carrito
- ✅ Preserva `addToCartLink` y metadatos por supermercado al reutilizar `cartService`
- ✅ Logs verbosos para depurar integraciones con VTEX/Supabase

### 6. **Modal de Productos Populares** (`src/components/PopularProducts.tsx`)
**Responsabilidad:** Mostrar detalles rápidos y acciones por supermercado al tocar una tarjeta destacada.

**Características:**
- ✅ Al tocar una tarjeta se abre un modal con `selectedProduct` y la lista de supermercados disponibles.
- ✅ Cada supermercado reutiliza los mismos controles de cantidad (+/-) inline y botones "Agregar al carrito" conectados al `cartService`.
- ✅ El botón “Ver resultados” cierra el modal y navega a Search con el contexto correcto (`searchTrigger`) para ejecutar la búsqueda automáticamente.
- ✅ Indicadores visuales por supermercado (precio, stock, tiempo de actualización) sincronizados con caché predictivo.

---

## 🔄 Flujo de Datos

### Agregar Producto al Carrito

```
1. Usuario presiona "+" en SupermarketItem
   ↓
2. cartService.addToCart(product, 1) se ejecuta y el botón muestra spinner
   ↓
3. notifyListeners() dispara el refresh del hook useCart
   ↓
4. CartScreen, AnimatedCartBadge y los controles +/- inline se actualizan con la nueva cantidad
```

Para incrementos/decrementos subsecuentes, los botones +/- llaman a `cartService.addToCart` o `cartService.updateQuantity` sin bloquear la UI, manteniendo la cantidad en sincronía sin necesidad de modales.

### Agregar al Carrito del Supermercado

```
1. Usuario presiona "Agregar al carrito" en CartScreen
   ↓
2. Se obtiene addToCartLink del producto
   ↓
3. Se actualiza el parámetro qty con la cantidad seleccionada
   ↓
4. Se abre la URL con Linking.openURL()
   ↓
5. Navegador/App del supermercado se abre con producto en carrito
```

---

## 🔗 Integración con Supermercados

### URLs de "Add to Cart"

Cada producto tiene un campo `addToCartLink` que apunta a la API del supermercado:

**Formato VTEX (Vea, Jumbo, Disco):**
```
https://www.vea.com.ar/checkout/cart/add?sku=SKU&qty=1&seller=1&sc=34&price=PRICE&cv=_&sc=34
```

**Formato Carrefour:**
```
https://www.carrefour.com.ar/checkout/cart/add?sku=SKU&qty=1&seller=1&sc=1&price=PRICE&cv=_&sc=1
```

### Actualización Dinámica de Cantidad

```typescript
const updateCartLinkQuantity = (cartLink: string, quantity: number): string => {
  if (!cartLink) return cartLink;

  try {
    const url = new URL(cartLink);
    url.searchParams.set('qty', quantity.toString());
    return url.toString();
  } catch (error) {
    console.error('Error updating cart link quantity:', error);
    // Fallback usando regex
    return cartLink
      .replace(/[?&]qty=\d+/, `qty=${quantity}`)
      .replace(/qty=\d+/, `qty=${quantity}`);
  }
};
```

### Fuentes de `addToCartLink`

1. **Base de datos (`reg_prices` table)**
   - Campo: `add_to_cart_link`
   - Incluye: SKU, seller_id, price

2. **n8n workflows**
   - Se extrae durante el scraping
   - Se normaliza y valida antes de guardar

3. **Fallback en frontend**
   - Se construye desde `product.url` si no está disponible

---

## 💾 Persistencia de Datos

### AsyncStorage (Futuro)
**Estado actual:** No implementado
**Próxima versión:** v1.5.0

```typescript
// Planificado
import AsyncStorage from '@react-native-async-storage/async-storage';

private async saveCart(): Promise<void> {
  await AsyncStorage.setItem('cart', JSON.stringify(this.cart));
}

private async loadCart(): Promise<void> {
  const cartData = await AsyncStorage.getItem('cart');
  this.cart = cartData ? JSON.parse(cartData) : [];
}
```

### Estado actual
El carrito se mantiene en memoria durante la sesión de la app. Se reinicia al cerrar/reabrir la aplicación.

---

## 🎨 UX/UI Mejoras Implementadas

### 1. Modales Personalizados
Reemplazo de `Alert.alert` nativo por modales custom con mejor UX:

```typescript
<Modal
  transparent
  visible={showConfirmModal}
  animationType="fade"
  onRequestClose={() => setShowConfirmModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Confirmar</Text>
      <Text style={styles.modalMessage}>
        ¿Deseas agregar {quantity} unidad(es) al carrito?
      </Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity onPress={handleCancel}>
          <Text>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleConfirm}>
          <Text>Agregar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

### 2. Capitalización de Marcas
```typescript
const capitalizeBrand = (brand: string): string => {
  const lowerWords = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);
  
  return brand
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !lowerWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};
```

### 3. Animación del Badge
- Spring animation con fricción y tensión customizada
- Trigger automático al cambiar `totalItems`
- Solo anima el número, no el fondo

---

## 🐛 Problemas Resueltos

### 1. Badge Duplicado
**Problema:** Dos círculos rojos en el ícono del carrito
**Solución:** Remover `tabBarBadge` nativo de React Navigation, usar solo `AnimatedCartBadge`

### 2. Badge No Actualizaba
**Problema:** Número del badge no se actualizaba al agregar productos
**Solución:** Implementar sistema de listeners en `cartService` + suscripción en `useCart`

### 3. Alert.alert No Aparecía
**Problema:** `Alert.alert` no se mostraba en algunos dispositivos
**Solución:** Reemplazar con modales personalizados (`Modal` component)

### 4. addToCartLink Incorrecto
**Problema:** Todos los productos redirigían a Vea
**Solución:** 
- Agregar `seller_name` y `add_to_cart_link` a tabla `reg_prices`
- Modificar SQL queries para extraer correctamente por seller
- Ajustar n8n nodes para mapear correctamente

### 5. Animación del Fondo
**Problema:** El círculo rojo del badge también animaba
**Solución:** Aplicar `Animated.View` solo al `Text`, no al contenedor

---

## 📊 Métricas de Implementación

### Archivos Creados
- ✅ `src/services/cartService.ts` (203 líneas)
- ✅ `src/screens/CartScreen.tsx` (487 líneas)
- ✅ `src/hooks/useCart.ts` (47 líneas)
- ✅ `src/components/AnimatedCartBadge.tsx` (95 líneas)

### Archivos Modificados
- ✅ `src/navigation/AppNavigator.tsx` (+30 líneas)
- ✅ `src/components/ProductCard/SupermarketItem.tsx` (+150 líneas)
- ✅ `src/components/GroupedProductCard.tsx` (-50 líneas, removido modal)
- ✅ `src/screens/SearchScreen.tsx` (+80 líneas, mapeo de addToCartLink)

### Archivos Eliminados
- ❌ `src/hooks/useProductModal.ts` (no utilizado)

### Total
- **Líneas agregadas:** ~1,012
- **Líneas modificadas:** ~260
- **Líneas eliminadas:** ~354
- **Net:** +658 líneas

---

## 🔮 Mejoras Futuras

### v1.5.0 (Próxima)
- [ ] Persistencia con AsyncStorage
- [ ] Migrar a Redux Toolkit para estado global
- [ ] Validación con Zod para CartItem
- [ ] Tests unitarios para cartService
- [ ] Tests de integración para flujo completo

### v1.6.0
- [ ] Sincronización multi-dispositivo (requiere auth)
- [ ] Historial de carritos guardados
- [ ] Estimación de tiempos de entrega
- [ ] Comparador de subtotales por supermercado

### v2.0.0
- [ ] Checkout integrado (requiere acuerdos con supermercados)
- [ ] Sistema de cupones y descuentos
- [ ] Listas de compra compartidas
- [ ] Notificaciones push para cambios de precio en carrito

---

## 📚 Referencias

- [React Navigation - Tab Bar Badge](https://reactnavigation.org/docs/bottom-tab-navigator#tabbarBadge)
- [React Native - Animated API](https://reactnative.dev/docs/animated)
- [Observer Pattern](https://refactoring.guru/design-patterns/observer)
- [VTEX Add to Cart API](https://developers.vtex.com/docs/guides/checkout-api-overview)

---

## 📧 Contacto

**Desarrollador:** Dante Luchini
**Email:** danteluchini@gmail.com
**GitHub:** [@dntluchini](https://github.com/dntluchini)

---

> **Nota:** Esta documentación refleja el estado del sistema al **12 de Noviembre, 2025**.
> Para actualizaciones, consultar `context.json` o el historial de commits en GitHub.

