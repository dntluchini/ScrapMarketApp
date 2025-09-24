// Constantes para procesamiento de nombres de productos
// Mover a archivo separado para evitar recreación en cada render

export const PRODUCT_BRANDS = [
  'sprite', 'coca cola', 'coca-cola', 'coca', 'pepsi', 'fanta', 'seven up', 
  'schweppes', 'powerade', 'gatorade', 'aquarius', 'vitamin water',
  'nestle', 'nesquik', 'nescafe', 'maggi', 'kit kat', 'crunch',
  'ferrero', 'nutella', 'kinder', 'tictac', 'ferrero rocher',
  'mars', 'snickers', 'm&m', 'twix', 'milky way', 'bounty',
  'mondelez', 'oreo', 'belvita', 'triscuit', 'ritz', 'chips ahoy',
  'kraft', 'philadelphia', 'toblerone', 'cadbury',
  'unilever', 'lipton', 'knorr', 'hellmann', 'ben & jerry',
  'danone', 'activia', 'danonino', 'danette', 'danup',
  'pepsico', 'lays', 'doritos', 'cheetos', 'ruffles', 'fritos',
  'pepitos', 'pepito', 'terrabusi', 'bagley', 'arcor', 'bon o bon',
  'alfajor', 'alfajores', 'havanna', 'cachafaz', 'jorgito'
] as const;

export const PRODUCT_TYPES = [
  'zero', 'light', 'diet', 'sin azucar', 'sin azúcar', 'comun', 
  'original', 'clasica', 'clásica', 'x3', 'x2', 'x4', 'x5', 'x6'
] as const;

export const PRODUCT_FLAVORS = [
  'lima limon', 'lima limón', 'limon', 'limón', 'naranja', 'uva', 'manzana', 
  'frutilla', 'fresa', 'cereza', 'durazno', 'melocoton', 'melocotón',
  'mango', 'piña', 'ananá', 'coco', 'menta', 'hierbabuena',
  'chocolate', 'vainilla', 'dulce de leche', 'frutilla', 'banana',
  'menta', 'coco', 'almendras', 'nueces', 'avellanas', 'pistacho'
] as const;

export const PRODUCT_UNITS = [
  'ml', 'lt', 'lts', 'kg', 'g', 'gr', 'gramos', 'kilos', 
  'unidades', 'u', 'pcs', 'piezas'
] as const;

// Tipos de productos por categoría
export const PRODUCT_CATEGORIES = [
  // Bebidas
  { keywords: ['gaseosa', 'soda', 'bebida', 'refresco'], category: 'Gaseosa' },
  { keywords: ['agua', 'mineral'], category: 'Agua' },
  { keywords: ['jugo', 'néctar'], category: 'Jugo' },
  { keywords: ['cerveza', 'birra'], category: 'Cerveza' },
  
  // Dulces y golosinas
  { keywords: ['alfajor', 'alfajores'], category: 'Alfajor' },
  { keywords: ['galletita', 'galletas', 'cookies'], category: 'Galletitas' },
  { keywords: ['chocolate', 'barra'], category: 'Chocolate' },
  { keywords: ['caramelo', 'dulce'], category: 'Dulce' },
  { keywords: ['chicle', 'goma'], category: 'Chicle' },
  
  // Snacks
  { keywords: ['papas', 'chips', 'snack'], category: 'Snack' },
  { keywords: ['mani', 'maní', 'nueces', 'almendras'], category: 'Frutos Secos' },
  { keywords: ['palomitas', 'popcorn'], category: 'Palomitas' },
  
  // Lácteos
  { keywords: ['yogur', 'yogurt'], category: 'Yogur' },
  { keywords: ['leche'], category: 'Leche' },
  { keywords: ['queso', 'crema'], category: 'Lácteo' },
  
  // Panificados
  { keywords: ['pan', 'tostadas'], category: 'Pan' },
  { keywords: ['facturas', 'medialunas'], category: 'Facturas' },
  
  // Conservas
  { keywords: ['atún', 'sardinas'], category: 'Conserva' },
  { keywords: ['aceitunas', 'pickles'], category: 'Encurtidos' },
  
  // Condimentos
  { keywords: ['aceite', 'vinagre'], category: 'Condimento' },
  { keywords: ['sal', 'azúcar', 'azucar'], category: 'Condimento' },
  { keywords: ['mayonesa', 'ketchup', 'mostaza'], category: 'Aderezo' },
  
  // Congelados
  { keywords: ['helado', 'postre'], category: 'Helado' },
  { keywords: ['pizza', 'empanadas'], category: 'Congelado' },
  
  // Higiene
  { keywords: ['shampoo', 'jabón', 'jabon'], category: 'Higiene' },
  { keywords: ['pasta', 'dentífrico'], category: 'Higiene Bucal' },
  { keywords: ['papel', 'higiénico'], category: 'Higiene' }
] as const;

/**
 * Detecta la categoría del producto basándose en palabras clave
 */
const detectProductCategory = (productName: string): string => {
  const lowerProduct = productName.toLowerCase();
  
  for (const category of PRODUCT_CATEGORIES) {
    for (const keyword of category.keywords) {
      if (lowerProduct.includes(keyword.toLowerCase())) {
        return category.category;
      }
    }
  }
  
  return '';
};

/**
 * Estructura un producto individual siguiendo el formato:
 * Marca + Categoría + Tipo + Sabor + Cantidad
 */
const structureProduct = (productName: string): string => {
  const lowerProduct = productName.toLowerCase();
  
  // 1. Extraer marca
  let brand = '';
  for (const b of PRODUCT_BRANDS) {
    if (lowerProduct.includes(b.toLowerCase())) {
      brand = b.charAt(0).toUpperCase() + b.slice(1);
      break;
    }
  }
  
  // 2. Detectar categoría del producto
  const category = detectProductCategory(productName);
  
  // 3. Extraer tipo (incluyendo packs como x3, x2, etc.)
  let type = '';
  for (const t of PRODUCT_TYPES) {
    if (lowerProduct.includes(t.toLowerCase())) {
      // Los packs (x3, x2, etc.) se mantienen en mayúsculas, los tipos se capitalizan
      if (t.startsWith('x') && t.length <= 3) {
        type = t.toUpperCase(); // X3, X2, etc.
      } else {
        type = t.charAt(0).toUpperCase() + t.slice(1); // Zero, Light, etc.
      }
      break;
    }
  }
  
  // 4. Extraer sabor
  let flavor = '';
  for (const f of PRODUCT_FLAVORS) {
    if (lowerProduct.includes(f.toLowerCase())) {
      flavor = f.charAt(0).toUpperCase() + f.slice(1);
      break;
    }
  }
  
  // 5. Extraer cantidad (número + unidad)
  const quantityMatch = lowerProduct.match(/(\d+(?:[.,]\d+)?)\s*(ml|lt|lts|kg|g|gr|gramos|kilos|unidades|u|pcs|piezas)/);
  let quantity = '';
  if (quantityMatch) {
    const number = quantityMatch[1];
    const unit = quantityMatch[2].toUpperCase();
    quantity = `${number.replace(',', '.')}${unit}`;
  }
  
  // Construir partes, evitando "Original" innecesario
  const parts = [brand, category, type, flavor, quantity].filter(part => 
    part && 
    part.trim() !== '' && 
    part !== 'Original' // No mostrar "Original" si no hay otros elementos
  );
  
  // Si solo tenemos la marca, devolver el nombre original
  if (parts.length <= 1 && brand) {
    return productName;
  }
  
  return parts.length > 1 ? parts.join(' ') : productName;
};

/**
 * Limpia y estructura el nombre de un producto, manejando packs
 * Optimizado para performance en React Native
 */
export const cleanProductName = (name: string): string => {
  if (!name) return '';
  
  const lowerName = name.toLowerCase();
  
  // Detectar si es un pack (contiene + o múltiples marcas o indicadores de pack)
  const hasMultipleProducts = lowerName.includes('+') || 
    lowerName.includes(' x3') || lowerName.includes(' x2') || lowerName.includes(' x4') ||
    lowerName.includes(' x5') || lowerName.includes(' x6') ||
    PRODUCT_BRANDS.filter(brand => lowerName.includes(brand.toLowerCase())).length > 1;
  
  if (hasMultipleProducts) {
    // Es un pack - separar productos
    let products: string[] = [];
    
    if (lowerName.includes('+')) {
      // Separar por +
      products = name.split('+').map(p => p.trim());
    } else if (lowerName.includes(' x3') || lowerName.includes(' x2') || lowerName.includes(' x4') || 
               lowerName.includes(' x5') || lowerName.includes(' x6')) {
      // Es un pack de unidades (x3, x2, etc.) - mantener como un solo producto
      return structureProduct(name);
    } else {
      // Detectar múltiples marcas en el mismo texto
      const foundBrands = PRODUCT_BRANDS.filter(brand => lowerName.includes(brand.toLowerCase()));
      if (foundBrands.length > 1) {
        // Intentar separar por contexto
        const spriteIndex = lowerName.indexOf('sprite');
        const cocaIndex = lowerName.indexOf('coca');
        
        if (spriteIndex !== -1 && cocaIndex !== -1) {
          if (spriteIndex < cocaIndex) {
            products = [
              name.substring(0, cocaIndex).trim(),
              name.substring(cocaIndex).trim()
            ];
          } else {
            products = [
              name.substring(0, spriteIndex).trim(),
              name.substring(spriteIndex).trim()
            ];
          }
        }
      }
    }
    
    if (products.length > 1) {
      // Estructurar cada producto
      const structuredProducts = products.map(product => structureProduct(product));
      
      // Priorizar Sprite primero si está presente
      const spriteProduct = structuredProducts.find(p => p.toLowerCase().includes('sprite'));
      const otherProducts = structuredProducts.filter(p => !p.toLowerCase().includes('sprite'));
      
      if (spriteProduct) {
        return [spriteProduct, ...otherProducts].join(' + ');
      } else {
        return structuredProducts.join(' + ');
      }
    }
  }
  
  // Producto individual - usar función normal
  return structureProduct(name);
};

/**
 * Formatea un precio para mostrar en la UI
 */
export const formatPrice = (price: number | string | undefined | null): string => {
  if (price === undefined || price === null || price === '') {
    return '$0.00';
  }
  
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  if (isNaN(numericPrice)) {
    return '$0.00';
  }
  
  return `$${numericPrice.toFixed(2)}`;
};
