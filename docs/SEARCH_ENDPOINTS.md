# 🔍 Endpoints de Búsqueda - ScrapMarket App

Este documento describe los diferentes endpoints de búsqueda y cuándo se utilizan en la aplicación.

## 📋 Endpoints Disponibles

### 1. `/webhook/quick_search` - Búsqueda por Categoría

**Cuándo se usa:** Cuando el usuario presiona una categoría en el HomeScreen (Limpieza, Vegetales, Carnes, Bebidas, Lácteos, Panadería).

**URL:** `http://192.168.1.99:5678/webhook/quick_search?q=categoria`

**Flujo:**
1. Usuario presiona categoría en HomeScreen
2. `HomeScreen` llama a `quick_search` con el query de la categoría
3. Recibe array directo de productos con `supermarkets`
4. Normaliza los productos a formato `GroupedProduct`
5. Navega a `SearchScreen` con `prefetchedGroups`
6. `SearchScreen` muestra los productos **SIN** llamar a otros endpoints

**Formato de Respuesta:**
```json
[
  {
    "canonname": "producto ejemplo",
    "brand": "MARCA",
    "exact_weight": "250g",
    "min_price": 3200,
    "max_price": 3200,
    "total_supermarkets": 3,
    "imageUrl": "https://...",
    "supermarkets": [
      {
        "super": "Disco",
        "precio": 3200,
        "stock": true,
        "url": "https://...",
        "addToCartLink": "https://..."
      }
    ]
  }
]
```

**Características:**
- ✅ NO llama a `search-in-db`
- ✅ NO llama a `search-products-complete`
- ✅ Muestra resultados inmediatamente desde `prefetchedGroups`
- ✅ Limpia el input automáticamente si el usuario quiere hacer otra búsqueda

---

### 2. `/webhook/search-popular-products` - Búsqueda desde Productos Populares

**Cuándo se usa:** Cuando el usuario presiona un producto del carrusel de productos populares.

**URL:** `http://192.168.1.99:5678/webhook/search-popular-products?q=nombre_del_producto`

**Flujo:**
1. Usuario presiona producto en carrusel de productos populares
2. `PopularProducts` llama a `onProductSelect` con el nombre del producto
3. `HomeScreen` navega a `SearchScreen` con `fromPopularProducts: true`
4. `SearchScreen` detecta `fromPopularProducts` y llama a `search-popular-products`
5. Procesa los resultados y los muestra
6. **NO** continúa con otros endpoints

**Características:**
- ✅ Solo usa `search-popular-products`
- ✅ NO llama a `search-in-db`
- ✅ NO llama a `search-products-complete`
- ✅ Se detiene después de mostrar resultados

---

### 3. `/webhook/search-in-db` - Búsqueda en Base de Datos

**Cuándo se usa:** Cuando el usuario hace una búsqueda manual (escribiendo en el input de búsqueda).

**URL:** `http://192.168.1.99:5678/webhook/search-in-db?q=query`

**Flujo:**
1. Usuario escribe query en SearchScreen
2. `SearchScreen` llama primero a `search-in-db`
3. Si encuentra resultados, los muestra y se detiene
4. Si NO encuentra resultados, continúa con `search-products-complete`

**Características:**
- ✅ Primera opción para búsquedas manuales
- ✅ Rápido (solo consulta BD)
- ✅ Si no hay resultados, hace fallback a scraping

---

### 4. `/webhook/search-products-complete` - Búsqueda Completa con Scraping

**Cuándo se usa:** Cuando `search-in-db` no encuentra resultados en una búsqueda manual.

**URL:** `http://192.168.1.99:5678/webhook/search-products-complete?q=query`

**Flujo:**
1. Solo se llama si `search-in-db` no encontró resultados
2. Realiza scraping en tiempo real de los supermercados
3. Muestra resultados progresivamente
4. Guarda productos en BD automáticamente

**Características:**
- ⚠️ Solo para búsquedas manuales
- ⚠️ NO se usa para categorías ni productos populares
- ✅ Scraping en tiempo real
- ✅ Guarda resultados en BD

---

## 🚫 Prevención de Llamadas Incorrectas

### Búsquedas por Categoría
- **NO** debe llamar a `search-in-db`
- **NO** debe llamar a `search-products-complete`
- **Solo** usa `quick_search` y muestra `prefetchedGroups`

### Búsquedas desde Productos Populares
- **NO** debe llamar a `search-in-db`
- **NO** debe llamar a `search-products-complete`
- **Solo** usa `search-popular-products`

### Búsquedas Manuales
- **Primero** llama a `search-in-db`
- **Solo si no hay resultados**, llama a `search-products-complete`

---

## 🔧 Implementación Técnica

### Detección de Origen de Búsqueda

```typescript
// HomeScreen.tsx
const navigateToSearch = (params: Record<string, any> = {}) => {
  navigation.navigate('Search', {
    searchTrigger: Date.now(), // fuerza a SearchScreen a limpiar estado y ejecutar la nueva query
    ...params,
  });
};

const handleQuickSearch = async (item: QuickSearchItem) => {
  const response = await fetch(`${getQuickSearchEndpoint()}?q=${encodeURIComponent(item.query)}`);
  const payload = await response.json();
  const prefetchedGroups = normalizeQuickSearchResponse(payload);

  if (prefetchedGroups.length === 0) {
    navigateToSearch({ initialQuery: item.query });
    return;
  }

  navigateToSearch({
    initialQuery: item.query,
    prefetchedGroups,
    quickSearchMeta: { category: item.label, source: 'quick_search' },
    fromQuickSearch: true,
  });
};

// PopularProducts.tsx
const handleSelectProduct = (product: GroupedProduct) => {
  navigateToSearch({
    initialQuery: product.display_name,
    fromPopularProducts: true,
  });
};
```

### Prevención en SearchScreen

```typescript
// SearchScreen.tsx
React.useEffect(() => {
  if (
    route?.params?.prefetchedGroups &&
    Array.isArray(route.params.prefetchedGroups) &&
    route.params.prefetchedGroups.length > 0
  ) {
    // Solo precargar el input; la ejecución la hará el efecto de searchTrigger
    setSearchQuery(route.params.initialQuery ?? '');
  }
}, [route?.params?.initialQuery, route?.params?.prefetchedGroups]);

React.useEffect(() => {
  const trigger = route?.params?.searchTrigger;
  if (!trigger || trigger === lastSearchTrigger) {
    return;
  }

  setLastSearchTrigger(trigger);

  const incomingQuery = route?.params?.initialQuery || '';
  const hasPrefetchedGroups =
    route?.params?.prefetchedGroups &&
    Array.isArray(route.params.prefetchedGroups) &&
    route.params.prefetchedGroups.length > 0;

  resetSearchState(); // limpia groupedProducts, filtros, flags y loaders
  setSearchQuery(incomingQuery);
  setIsLoading(hasPrefetchedGroups ? false : incomingQuery.trim().length >= 2);

  const run = async () => {
    if (hasPrefetchedGroups) {
      setGroupedProducts(route?.params?.prefetchedGroups || []);
      setFilteredGroups(route?.params?.prefetchedGroups || []);
      setHasPrefetchedData(true);
      navigation.setParams({ searchTrigger: undefined, prefetchedGroups: undefined });
      return;
    }

    if (incomingQuery.trim().length >= 2) {
      if (route?.params?.fromPopularProducts) {
        await n8nMcpService.searchPopularProducts(incomingQuery);
      } else {
        await executeSearchWithQuery(incomingQuery);
      }
    } else {
      setIsLoading(false);
    }

    navigation.setParams({ searchTrigger: undefined });
  };

  run();
}, [
  route?.params?.searchTrigger,
  route?.params?.initialQuery,
  route?.params?.prefetchedGroups,
  route?.params?.fromPopularProducts,
  navigation,
  lastSearchTrigger,
]);
```

---

## 📝 Notas Importantes

1. **URLs deben usar IP, no localhost**: Todas las URLs deben usar `192.168.1.99` en lugar de `localhost` para evitar problemas de CORS en dispositivos móviles.

2. **Formato de respuesta**: El endpoint `quick_search` devuelve un array directo de productos con `supermarkets`, sin wrapper `json`.

3. **Normalización**: La función `normalizeQuickSearchResponse` en `HomeScreen.tsx` maneja múltiples formatos de respuesta de n8n.

4. **Sincronización con Search**: Toda navegación debe enviar `searchTrigger` + `initialQuery` (y `prefetchedGroups` si aplica) para que SearchScreen limpie resultados previos, reemplace el texto del input y ejecute la nueva búsqueda automáticamente.

---

## 🐛 Troubleshooting

### Problema: Se llama a search-in-db cuando presiono una categoría
**Solución:** Verificar que `prefetchedGroups` se esté pasando correctamente y que el `useEffect` que procesa `prefetchedGroups` se ejecute antes del que ejecuta la búsqueda automática.

### Problema: No se muestran productos de quick_search
**Solución:** Verificar que `normalizeQuickSearchResponse` detecte correctamente el formato de respuesta. Agregar logs para ver qué formato está llegando.

### Problema: Error CORS al llamar endpoints
**Solución:** Asegurarse de que todas las URLs usen la IP `192.168.1.99` en lugar de `localhost`.

