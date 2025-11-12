# 🔧 Fix: Workflow Popular Products - Consulta SQL y Código JS

## Problema
El workflow `popular_products` no está retornando todos los supermercados disponibles para cada producto.

---

## ✅ Solución: Adaptar la Búsqueda Normal

Tu flujo de búsqueda normal **YA FUNCIONA CORRECTAMENTE**. Solo necesitas aplicar la misma lógica al workflow de productos populares.

---

## 📋 Pasos en n8n

### 1. Nodo SQL: "Get Popular Products from DB"

Reemplaza tu consulta SQL actual con esta (adaptada de tu búsqueda normal):

**📄 Ver archivo completo:** `n8n-code/popular_products_query.sql`

```sql
-- Query SIMPLIFICADA para Popular Products
-- Retorna UN ROW por CADA SUPERMERCADO de CADA PRODUCTO

WITH popular_terms AS (
  SELECT unnest(ARRAY[
    'coca cola', 'coca-cola', 'sprite', 'fanta', 'pepsi',
    'alfajor', 'havanna', 'jorgito', 'guaymallen',
    'galletita', 'oreo', 'terrabusi', 'bagley',
    'cerveza', 'quilmes', 'brahma', 'stella artois',
    'vino', 'toro', 'trapiche',
    'leche', 'la serenisima', 'sancor', 'milkaut',
    'yogur', 'ser', 'la paulina',
    'queso', 'cremoso', 'casancrem',
    'dulce de leche',
    'pan', 'lactal', 'bimbo', 'fargo',
    'aceite', 'natura', 'cocinero',
    'arroz', 'gallo',
    'fideos', 'matarazzo', 'lucchetti',
    'azucar', 'ledesma',
    'harina', 'pureza'
  ]) AS term
),

matching_products AS (
  SELECT DISTINCT p.product_id
  FROM products p
  CROSS JOIN popular_terms pt
  WHERE 
    LOWER(p.canonname) LIKE '%' || LOWER(pt.term) || '%'
    OR LOWER(p.brand) LIKE '%' || LOWER(pt.term) || '%'
    OR EXISTS (
      SELECT 1 FROM unnest(p.categories) AS cat
      WHERE LOWER(cat) LIKE '%' || LOWER(pt.term) || '%'
    )
  LIMIT 100
)

SELECT
  p.canonid,
  p.canonname,
  p.sku,
  p.brand,
  p.exact_weight,
  COALESCE(p.categories, ARRAY[]::text[]) AS categories,
  p.primary_category,
  rp.price,
  rp.stock,
  rp.product_url,
  rp.capture_date,
  s.super_name,
  COALESCE(NULLIF(p.image_url,''), NULLIF(p.sellers->0->>'imageUrl','')) AS image_url,
  COALESCE(NULLIF(rp.seller_id,''), NULLIF(p.seller_id,''), p.sellers->0->>'sellerId') AS seller_id,
  COALESCE(NULLIF(rp.seller_name,''), NULLIF(p.seller_name,''), p.sellers->0->>'sellerName') AS seller_name,
  COALESCE(NULLIF(rp.add_to_cart_link,''), NULLIF(p.add_to_cart_link,''), p.sellers->0->>'addToCartLink') AS add_to_cart_link,
  COALESCE(p.sellers, '[]'::jsonb) AS sellers

FROM matching_products mp
JOIN products p ON mp.product_id = p.product_id
JOIN reg_prices rp ON p.product_id = rp.product_id
JOIN supermarket s ON rp.supermarket_id = s.supermarket_id

WHERE rp.capture_date >= NOW() - INTERVAL '7 days'
  AND rp.stock = true
  AND rp.price > 0

ORDER BY p.canonid, rp.price ASC;
```

**Clave:** Esta query retorna **UN ROW POR CADA SUPERMERCADO** de cada producto. El agrupamiento se hace después en JavaScript.

---

### 2. Nodo JavaScript: "Group by Product"

Reemplaza tu código JS con este (adaptado de tu búsqueda normal):

```javascript
const rows = $input.all();

if (!rows.length) {
  return [{ json: { 
    status: 'not_found', 
    data: [], 
    total: 0,
    message: 'No popular products found in database'
  }}];
}

// Funciones auxiliares (copiadas de tu búsqueda normal)
const sellerKey = s => `${s?.sellerId ?? ''}|${s?.sellerName ?? ''}|${s?.addToCartLink ?? ''}`;

const extractProductName = (json) => {
  if (json.canonname) return json.canonname;
  if (json.display_name) return json.display_name;
  return 'Producto';
};

const toArrayMaybe = value => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeSeller = seller => ({
  sellerId: seller?.sellerId ?? seller?.seller_id ?? null,
  sellerName: seller?.sellerName ?? seller?.seller_name ?? null,
  addToCartLink: seller?.addToCartLink ?? seller?.add_to_cart_link ?? null,
});

const extractSellerForSupermarket = (row) => {
  if (row.seller_id || row.seller_name || row.add_to_cart_link) {
    return normalizeSeller({
      sellerId: row.seller_id,
      sellerName: row.seller_name,
      addToCartLink: row.add_to_cart_link,
    });
  }
  
  const sellers = toArrayMaybe(row.sellers);
  if (sellers.length > 0) {
    if (sellers.length === 1) {
      return normalizeSeller(sellers[0]);
    }
    const sellerWithLink = sellers.find(s => s.addToCartLink || s.add_to_cart_link);
    if (sellerWithLink) {
      return normalizeSeller(sellerWithLink);
    }
    return normalizeSeller(sellers[0]);
  }
  
  return normalizeSeller(row);
};

const extractImageUrl = (row) =>
  row.image_url ||
  row.imageUrl ||
  null;

// Agrupar por canonid (cada producto único)
const productGroups = new Map();

for (const { json } of rows) {
  const productName = extractProductName(json);
  const price = parseFloat(json.price || json.precio || 0);
  const canonid = json.canonid || `ean:${json.ean || 'UNKNOWN'}`;
  
  if (!productName || !price || price <= 0) {
    continue;
  }
  
  // Si el producto no existe, crear grupo
  if (!productGroups.has(canonid)) {
    productGroups.set(canonid, {
      canonid: canonid,
      canonname: productName,
      display_name: productName,
      brand: json.brand || 'UNKNOWN',
      ean: String(json.ean || canonid.replace(/^ean:/, '') || 'UNKNOWN'),
      sku: json.sku || '',
      exact_weight: json.exact_weight || 'UNKNOWN',
      supermarkets: new Map(),
      sellers: [],
      sellerSet: new Set(),
      alternativeNames: new Set([productName]),
      minPrice: Infinity,
      maxPrice: -Infinity,
      lastUpdated: null,
      imageUrl: null,
    });
  }
  
  const group = productGroups.get(canonid);
  
  // Actualizar precios
  group.minPrice = Math.min(group.minPrice, price);
  group.maxPrice = Math.max(group.maxPrice, price);
  
  // Actualizar fecha
  if (json.capture_date) {
    if (!group.lastUpdated || json.capture_date > group.lastUpdated) {
      group.lastUpdated = json.capture_date;
    }
  }
  
  // Agregar nombre alternativo
  group.alternativeNames.add(productName);
  
  // Agregar imagen si no hay
  if (!group.imageUrl) {
    group.imageUrl = extractImageUrl(json);
  }
  
  // Agregar seller
  const sellerForSupermarket = extractSellerForSupermarket(json);
  const sellerKeyStr = sellerKey(sellerForSupermarket);
  if (!group.sellerSet.has(sellerKeyStr)) {
    group.sellers.push(sellerForSupermarket);
    group.sellerSet.add(sellerKeyStr);
  }
  
  // Agregar o actualizar supermercado
  const superName = json.super_name || json.supermercado || 'UNKNOWN';
  if (!group.supermarkets.has(superName)) {
    group.supermarkets.set(superName, {
      supermercado: superName,  // ← IMPORTANTE: usar "supermercado" no "super"
      precio: price,
      stock: Boolean(json.stock),
      url: json.product_url || json.url || '',
      capture_date: json.capture_date || new Date().toISOString(),
      imageUrl: extractImageUrl(json),
      sellerId: sellerForSupermarket.sellerId,
      sellerName: sellerForSupermarket.sellerName,
      addToCartLink: sellerForSupermarket.addToCartLink,
    });
  } else {
    // Actualizar el supermercado existente si encontramos mejor información
    const existingSuper = group.supermarkets.get(superName);
    if (!existingSuper.addToCartLink && sellerForSupermarket.addToCartLink) {
      existingSuper.sellerId = sellerForSupermarket.sellerId;
      existingSuper.sellerName = sellerForSupermarket.sellerName;
      existingSuper.addToCartLink = sellerForSupermarket.addToCartLink;
    }
    // Mantener el precio más bajo
    if (price < existingSuper.precio) {
      existingSuper.precio = price;
    }
  }
}

// Convertir Map a Array y construir respuesta
const data = Array.from(productGroups.values()).map(group => ({
  canonid: group.canonid,
  canonname: group.canonname,
  display_name: group.canonname,
  brand: group.brand,
  ean: group.ean,
  sku: group.sku,
  exact_weight: group.exact_weight,
  min_price: group.minPrice === Infinity ? 0 : group.minPrice,
  max_price: group.maxPrice === -Infinity ? 0 : group.maxPrice,
  total_supermarkets: group.supermarkets.size,  // ← Calculado desde el Map
  last_updated: group.lastUpdated || new Date().toISOString(),
  alternative_names: Array.from(group.alternativeNames),
  imageUrl: group.imageUrl,
  sellers: group.sellers,
  supermarkets: Array.from(group.supermarkets.values()),  // ← Array completo
  has_stock: Array.from(group.supermarkets.values()).some(s => s.stock),
  best_price: Array.from(group.supermarkets.values())
    .reduce((best, current) => current.precio < best.precio ? current : best,
      { precio: Infinity })
}));

// Ordenar por popularidad (más supermercados = más popular)
data.sort((a, b) => b.total_supermarkets - a.total_supermarkets);

// Limitar a top 20 productos populares
const topProducts = data.slice(0, 20);

return [{
  json: {
    status: 'success',
    data: topProducts,
    total: topProducts.length,
    message: `Found ${topProducts.length} popular products`,
    timestamp: new Date().toISOString()
  }
}];
```

---

## 🎯 Puntos Clave

### 1. **La query SQL retorna múltiples rows por producto**
- ✅ Un row por cada supermercado
- ✅ Incluye TODOS los datos necesarios
- ✅ No agrupa en SQL, agrupa en JavaScript

### 2. **El código JS agrupa correctamente**
- ✅ Usa `Map()` para agrupar por `canonid`
- ✅ Cada grupo mantiene un `Map()` de supermercados
- ✅ Calcula `total_supermarkets` desde `supermarkets.size`
- ✅ Convierte el Map a Array al final

### 3. **La respuesta incluye el array completo**
```javascript
{
  canonid: "prod_123",
  canonname: "Leche En Polvo La Serenisima 400g",
  total_supermarkets: 4,  // ← Calculado desde supermarkets.length
  supermarkets: [         // ← Array completo con TODOS los supermercados
    { supermercado: "carrefour", precio: 6519, ... },
    { supermercado: "vea", precio: 6523, ... },
    { supermercado: "jumbo", precio: 6523, ... },
    { supermercado: "disco", precio: 7045, ... }
  ]
}
```

---

## ⚠️ Errores Comunes a Evitar

### ❌ NO uses GROUP BY en SQL
```sql
-- MAL: Esto pierde información de supermercados
SELECT canonid, MIN(price), COUNT(*) as total
FROM products p
JOIN reg_prices rp ON p.product_id = rp.product_id
GROUP BY canonid;
```

### ❌ NO uses json_agg() sin agrupar correctamente
```sql
-- MAL: Esto puede duplicar productos
SELECT json_agg(...) as supermarkets
FROM reg_prices;
```

### ✅ USA la query simple que retorna rows individuales
```sql
-- BIEN: Retorna un row por supermercado, agrupa en JS
SELECT p.canonid, p.canonname, rp.price, s.super_name
FROM products p
JOIN reg_prices rp ON p.product_id = rp.product_id
JOIN supermarket s ON rp.supermarket_id = s.supermarket_id;
```

---

## 🧪 Cómo Testear

### 1. En n8n
- Ejecuta el workflow manualmente
- Inspecciona la salida del nodo SQL → debe ver múltiples rows por producto
- Inspecciona la salida del nodo JS → debe ver el array `supermarkets` completo

### 2. Verifica la respuesta del endpoint
```bash
curl http://192.168.1.99:5678/webhook/popular_products | jq '.[0]'
```

Debe mostrar:
```json
{
  "canonid": "...",
  "canonname": "...",
  "total_supermarkets": 4,
  "supermarkets": [
    { "supermercado": "carrefour", "precio": 6519 },
    { "supermercado": "vea", "precio": 6523 },
    { "supermercado": "jumbo", "precio": 6523 },
    { "supermercado": "disco", "precio": 7045 }
  ]
}
```

### 3. En la app
- Abre la app y ve a Home
- Mira las cards de productos populares
- El número "en X supermercados" debe ser correcto
- Al hacer clic, debe mostrar la misma cantidad

---

## 📝 Checklist

- [ ] Actualicé la query SQL del nodo "Get Popular Products from DB"
- [ ] Actualicé el código JS del nodo "Group by Product"
- [ ] La query retorna múltiples rows (no usa GROUP BY)
- [ ] El código JS agrupa por `canonid`
- [ ] Cada grupo tiene un Map de supermercados
- [ ] `total_supermarkets` se calcula como `supermarkets.size`
- [ ] El array `supermarkets` incluye TODOS los supermercados
- [ ] Cada objeto en `supermarkets` tiene `supermercado` (no `super`)
- [ ] Cada objeto tiene `addToCartLink`
- [ ] Ejecuté el workflow y verifiqué la salida
- [ ] Testé el endpoint con curl/Postman
- [ ] Verifiqué en la app que los números coinciden ✅

---

**Última actualización:** 12 de Noviembre, 2025

