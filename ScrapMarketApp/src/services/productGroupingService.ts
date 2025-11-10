export interface Product {
  canonid: string;
  canonname: string;
  precio: number;
  supermercado: string;
  ean: string;
  exact_weight: string;
  stock: boolean;
  url: string;
  imageUrl?: string;
  brand?: string; // ← Nueva propiedad brand del backend
  brandId?: string; // ← ID de la marca si está disponible
  sku?: string;
  skuRef?: string;
  storeBase?: string;
  site?: string;
  relevance?: number;
}

export interface GroupedProduct {
  ean: string;
  exact_weight: string;
  brand?: string; // ← Marca principal del grupo
  brandId?: string; // ← ID de la marca
  products: Product[];
  min_price: number;
  max_price: number;
  total_supermarkets: number;
  alternative_names: string[];
  display_name: string;
  has_stock: boolean;
  imageUrl?: string;
  best_price?: Product;
}

class ProductGroupingService {
  // Función simple para extraer supermercado de la URL
  extractSupermarketFromUrl(url: string): string {
    if (!url) return 'supermercado';
    
    const match = url.match(/^https?:\/\/(?:www\.)?([^\.]+)/);
    return match ? match[1] : 'supermercado';
  }

  // Función para normalizar y capitalizar marcas
  normalizeBrand(brand: string): string | null {
    if (!brand) return null;
    
    return brand.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  // Función para capitalizar marcas (solo primera palabra con mayúscula inicial)
  capitalizeBrand(brand: string): string {
    if (!brand) return '';
    
    const words = brand.toLowerCase().trim().split(' ');
    if (words.length === 0) return '';
    
    // Capitalizar solo la primera palabra
    const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const restWords = words.slice(1);
    
    return [firstWord, ...restWords].join(' ');
  }

  // Función para normalizar el nombre del producto para agrupación
  normalizeProductName(productName: string): string {
    if (!productName) return '';
    
    return productName
      .toLowerCase()
      .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
      .replace(/[^\w_]/g, '') // Remover caracteres especiales
      .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
      .replace(/^_|_$/g, ''); // Remover guiones bajos al inicio y final
  }

  // Función para extraer palabras clave del nombre del producto
  extractKeywords(productName: string): string[] {
    if (!productName) return [];
    
    const normalized = productName.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Reemplazar caracteres especiales con espacios
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
    
    return normalized.split(' ').filter(word => 
      word.length > 2 && // Palabras de más de 2 caracteres
      !['con', 'para', 'sin', 'del', 'las', 'los', 'una', 'uno'].includes(word) // Filtrar palabras comunes
    );
  }

  // Función para normalizar tipos de producto (zero, light, etc.)
  normalizeProductType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'zero': 'zero',
      'light': 'light', 
      'diet': 'diet',
      'sin azucar': 'zero',
      'sin azúcar': 'zero',
      'comun': 'original',
      'original': 'original',
      'clasica': 'original',
      'clásica': 'original'
    };
    
    return typeMap[type.toLowerCase()] || type.toLowerCase();
  }

  // Función mejorada para detectar si es un pack (contiene + y múltiples marcas)
  isPack(productName: string, productBrand?: string): boolean {
    const lowerName = productName.toLowerCase();
    if (!lowerName.includes('+')) return false;
    
    // Si tenemos la marca del backend, usar esa información
    if (productBrand) {
      // Para packs, la marca del backend puede ser diferente o estar vacía
      // Verificar si el nombre contiene múltiples marcas conocidas
      const keywords = this.extractKeywords(productName);
      const brands = keywords.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
      return brands.length > 1;
    }
    
    // Fallback al método anterior
    const keywords = this.extractKeywords(productName);
    const brands = keywords.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
    
    return brands.length > 1;
  }

  // Función mejorada para generar clave de agrupación dinámica para packs
  generatePackKey(productName: string, productBrand?: string): string {
    if (!this.isPack(productName, productBrand)) {
      return '';
    }
    
    // Extraer todas las marcas presentes en el pack
    const keywords = this.extractKeywords(productName);
    const brands = keywords.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
    
    if (brands.length > 1) {
      // Ordenar marcas alfabéticamente para consistencia
      return brands.sort().join('_') + '_pack';
    }
    
    return '';
  }

  // Función para calcular similitud entre dos nombres de productos
  calculateSimilarity(name1: string, name2: string): number {
    const keywords1 = this.extractKeywords(name1);
    const keywords2 = this.extractKeywords(name2);
    
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    // Detectar si ambos son packs (contienen +)
    const isPack1 = name1.includes('+');
    const isPack2 = name2.includes('+');
    
    if (isPack1 && isPack2) {
      // Para packs, verificar si contienen las mismas marcas principales
      const brands1 = keywords1.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
      const brands2 = keywords2.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
      
      // Si tienen las mismas marcas principales, alta similitud
      if (brands1.length > 0 && brands2.length > 0) {
        const commonBrands = brands1.filter(b1 => brands2.some(b2 => b1 === b2));
        if (commonBrands.length >= Math.min(brands1.length, brands2.length)) {
          return 0.9; // 90% de similitud para packs con mismas marcas
        }
      }
    }
    
    // Normalizar tipos de producto para comparación
    const normalizedKeywords1 = keywords1.map(k => this.normalizeProductType(k));
    const normalizedKeywords2 = keywords2.map(k => this.normalizeProductType(k));
    
    // Calcular intersección de palabras clave normalizadas
    const intersection = normalizedKeywords1.filter(keyword1 => 
      normalizedKeywords2.some(keyword2 => 
        keyword1.includes(keyword2) || keyword2.includes(keyword1)
      )
    );
    
    // Calcular similitud basada en palabras comunes
    const similarity = intersection.length / Math.max(normalizedKeywords1.length, normalizedKeywords2.length);
    
    // Bonus si las marcas principales coinciden
    const brands1 = keywords1.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
    const brands2 = keywords2.filter(k => ['sprite', 'coca', 'pepsi', 'pepitos', 'havanna', 'fanta', 'seven up'].includes(k));
    
    if (brands1.length > 0 && brands2.length > 0 && 
        brands1.some(b1 => brands2.some(b2 => b1 === b2))) {
      return Math.min(similarity + 0.3, 1.0); // Bonus del 30%
    }
    
    return similarity;
  }

  // Función para encontrar el grupo más similar
  findSimilarGroup(product: Product, existingGroups: Map<string, GroupedProduct>): string | null {
    const productKeywords = this.extractKeywords(product.canonname);
    let bestMatch = '';
    let bestSimilarity = 0.5; // Umbral mínimo de similitud (bajado para ser más permisivo)
    
    for (const [groupKey, group] of Array.from(existingGroups.entries())) {
      const similarity = this.calculateSimilarity(product.canonname, group.display_name);
      
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = groupKey;
      }
    }
    
    return bestMatch || null;
  }

  // Función para filtrar productos irrelevantes antes de agrupar
  filterRelevantProducts(products: Product[], searchTerm: string, minRelevance: number = 25): Product[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return products; // Si no hay término de búsqueda, devolver todos
    }
    
    console.log(`🔍 Filtering products for search: "${searchTerm}"`);
    console.log(`📊 Total products before filtering: ${products.length}`);
    
    const relevantProducts = products.filter(product => {
      const relevance = this.calculateProductRelevance(product, searchTerm);
      const isRelevant = relevance >= minRelevance;
      
      if (!isRelevant) {
        console.log(`❌ Filtered out: "${product.canonname}" (relevance: ${relevance.toFixed(1)})`);
      } else {
        console.log(`✅ Kept: "${product.canonname}" (relevance: ${relevance.toFixed(1)})`);
      }
      
      return isRelevant;
    });
    
    console.log(`✅ Relevant products after filtering: ${relevantProducts.length}`);
    return relevantProducts;
  }

  groupProductsByEanAndWeight(products: Product[], searchTerm?: string): GroupedProduct[] {
    // Primero filtrar productos irrelevantes si hay término de búsqueda
    const relevantProducts = searchTerm 
      ? this.filterRelevantProducts(products, searchTerm)
      : products;
    
    const groups = new Map<string, GroupedProduct>();
    
    console.log('🔍 Starting grouping with', relevantProducts.length, 'products');
    if (searchTerm) {
      console.log(`🎯 Search term: "${searchTerm}"`);
    }
    
    relevantProducts.forEach((product, index) => {
      // Normalizar marca del producto
      const normalizedBrand = product.brand ? this.normalizeBrand(product.brand) : null;
      const brandKey = normalizedBrand ? `brand_${normalizedBrand.replace(/\s+/g, '_')}` : 'no_brand';
      
      // CORRECCIÓN: Para productos con peso UNKNOWN, usar nombre normalizado como parte de la clave
      let weightKey = product.exact_weight;
      if (product.exact_weight === 'UNKNOWN' || product.exact_weight === 'NO_EAN') {
        // Extraer peso del nombre del producto si es posible
        const weightMatch = product.canonname.match(/(\d+(?:\.\d+)?)\s*(ml|lts?|kg|g|gr)/i);
        if (weightMatch) {
          weightKey = `${weightMatch[1]}${weightMatch[2].toLowerCase()}`;
        } else {
          // Si no se puede extraer peso, usar nombre normalizado
          weightKey = product.canonname?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') || `unknown_${index}`;
        }
      }
      
      const eanWeightKey = `${product.ean}_${weightKey}_${brandKey}`;
      
      console.log(`🔍 Product ${index}: "${product.canonname}" | EAN: ${product.ean} | Weight: ${product.exact_weight} | WeightKey: ${weightKey} | Brand: ${product.brand || 'N/A'} | Normalized: ${normalizedBrand || 'N/A'} | Supermarket: ${product.supermercado}`);
      
      // Intentar agrupación por EAN + peso + marca (más estricta)
      if (groups.has(eanWeightKey)) {
        console.log(`🔍 Product ${index}: EAN+Weight+Brand match found for "${product.canonname}"`);
        this.addProductToGroup(groups.get(eanWeightKey)!, product);
        return;
      }
      
      // Intentar agrupación por pack key
      const packKey = this.generatePackKey(product.canonname, product.brand);
      if (packKey && groups.has(packKey)) {
        console.log(`🔍 Product ${index}: Pack match found for "${product.canonname}" with key "${packKey}"`);
        this.addProductToGroup(groups.get(packKey)!, product);
        return;
      }
      
      // Intentar agrupación por EAN + peso (sin marca, más flexible)
      const eanWeightOnlyKey = `${product.ean}_${weightKey}`;
      if (groups.has(eanWeightOnlyKey)) {
        console.log(`🔍 Product ${index}: EAN+Weight match found for "${product.canonname}"`);
        this.addProductToGroup(groups.get(eanWeightOnlyKey)!, product);
        return;
      }
      
      // Para productos sin EAN válido, intentar agrupación por nombre normalizado
      if (product.ean === 'NO_EAN' || product.ean === 'UNKNOWN') {
        const normalizedName = product.canonname?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') || `unknown_${index}`;
        const nameBrandKey = `name_${normalizedName}_${normalizedBrand || 'no_brand'}`;
        if (groups.has(nameBrandKey)) {
          console.log(`🔍 Product ${index}: Name+Brand match found for "${product.canonname}"`);
          this.addProductToGroup(groups.get(nameBrandKey)!, product);
          return;
        }
      }
      
      // Si no hay coincidencia exacta, buscar grupo similar
      const similarGroupKey = this.findSimilarGroup(product, groups);
      
      if (similarGroupKey) {
        console.log(`🔍 Product ${index}: Similar match found for "${product.canonname}" with key "${similarGroupKey}"`);
        this.addProductToGroup(groups.get(similarGroupKey)!, product);
        return;
      }
      
      // Si no hay grupo similar, crear uno nuevo
      // Para productos sin EAN válido, usar nombre normalizado como clave
      let finalKey = packKey || eanWeightKey;
      if (product.ean === 'NO_EAN' || product.ean === 'UNKNOWN') {
        const normalizedName = product.canonname?.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_') || `unknown_${index}`;
        finalKey = `name_${normalizedName}_${normalizedBrand || 'no_brand'}`;
      }
      console.log(`🔍 Product ${index}: Creating new group for "${product.canonname}" with key "${finalKey}"`);
      groups.set(finalKey, {
        ean: product.ean,
        exact_weight: product.exact_weight,
        brand: normalizedBrand || undefined,
        brandId: product.brandId,
        products: [product],
        min_price: product.precio || 0,
        max_price: product.precio || 0,
        total_supermarkets: 1,
        alternative_names: [product.canonname],
        display_name: product.canonname,
        has_stock: product.stock || false,
        best_price: product,
        imageUrl: product.imageUrl,
      });
    });
    
    console.log('🔍 Final groups created:', groups.size);
    return Array.from(groups.values());
  }

  // Función auxiliar para agregar producto a un grupo existente
  private addProductToGroup(group: GroupedProduct, product: Product): void {
    // Verificar que no sea el mismo supermercado (evitar duplicados)
    const existingSupermarket = group.products.find(p => p.supermercado === product.supermercado);
    if (existingSupermarket) {
      return;
    }
    
    group.products.push(product);
    
    // Actualizar marca si no existe o si la nueva es más específica
    const normalizedBrand = product.brand ? this.normalizeBrand(product.brand) : null;
    if (normalizedBrand && (!group.brand || normalizedBrand.length > group.brand.length)) {
      group.brand = normalizedBrand;
      group.brandId = product.brandId;
    }
    
    // Actualizar precios
    if (product.precio > 0) {
      group.min_price = Math.min(group.min_price, product.precio);
      group.max_price = Math.max(group.max_price, product.precio);
    }
    
    // Actualizar stock
    if (product.stock) {
      group.has_stock = true;
    }

    if (!group.imageUrl && product.imageUrl) {
      group.imageUrl = product.imageUrl;
    }
    
    // Actualizar mejor precio
    if (!group.best_price || (product.precio > 0 && product.precio < group.best_price.precio)) {
      group.best_price = product;
    }
    
    group.total_supermarkets = group.products.length;
    
    // Agregar nombre alternativo si es diferente
    if (!group.alternative_names.includes(product.canonname)) {
      group.alternative_names.push(product.canonname);
    }
    
    // Actualizar nombre de display con el más descriptivo (priorizando los que tienen marca)
    if (product.brand && !group.brand) {
      group.display_name = product.canonname;
    } else if (product.canonname.length > group.display_name.length) {
      group.display_name = product.canonname;
    }
  }
  
  // Función mejorada para calcular relevancia del producto individual
  calculateProductRelevance(product: Product, searchTerm: string): number {
    const searchLower = searchTerm.toLowerCase().trim();
    const productName = product.canonname.toLowerCase();
    const brand = product.brand?.toLowerCase() || '';
    
    let relevance = 0;
    
    // 1. FILTRO SEMÁNTICO: Verificar si el producto es irrelevante
    if (this.isProductIrrelevant(productName, searchLower)) {
      return 0; // Producto completamente irrelevante
    }
    
    // 2. Coincidencia exacta en nombre (máxima prioridad)
    if (productName.includes(searchLower)) {
      relevance = Math.max(relevance, 100);
    }
    
    // 3. Coincidencia exacta en marca (alta prioridad)
    if (brand && brand.includes(searchLower)) {
      relevance = Math.max(relevance, 90);
    }
    
    // 4. Coincidencia de palabras completas (alta prioridad)
    const searchWords = searchLower.split(' ').filter(w => w.length > 1);
    const nameWords = productName.split(/[\s\-_]+/);
    
    let exactWordMatches = 0;
    let partialWordMatches = 0;
    
    searchWords.forEach(searchWord => {
      // Coincidencia exacta de palabra
      if (nameWords.includes(searchWord)) {
        exactWordMatches++;
      }
      // Coincidencia parcial de palabra (solo si es significativa)
      else if (nameWords.some(nameWord => nameWord.includes(searchWord) && searchWord.length > 3)) {
        partialWordMatches++;
      }
    });
    
    if (searchWords.length > 0) {
      const exactRelevance = (exactWordMatches / searchWords.length) * 85;
      const partialRelevance = (partialWordMatches / searchWords.length) * 35;
      relevance = Math.max(relevance, exactRelevance + partialRelevance);
    }
    
    // 5. BONUS: Coincidencia en contexto semántico
    const semanticBonus = this.calculateSemanticBonus(productName, searchLower);
    relevance += semanticBonus;
    
    // 6. PENALIZACIÓN: Productos que contienen palabras irrelevantes
    const penalty = this.calculateIrrelevancePenalty(productName, searchLower);
    relevance -= penalty;
    
    return Math.max(0, Math.min(relevance, 100)); // Cap between 0 and 100
  }

  // Función para detectar productos irrelevantes
  private isProductIrrelevant(productName: string, searchTerm: string): boolean {
    // Lista de palabras que indican productos irrelevantes para búsquedas de comida
    const irrelevantKeywords = [
      'alimento para perro', 'alimento para gato', 'comida para perro', 'comida para gato',
      'mascota', 'pet', 'dog', 'cat', 'perro', 'gato', 'animal', 'veterinario',
      'medicina', 'medicamento', 'farmacia', 'suplemento', 'vitamina',
      'limpieza', 'detergente', 'jabón', 'shampoo', 'pasta dental',
      'ropa', 'vestimenta', 'calzado', 'zapatos', 'camisa', 'pantalón',
      'electrodoméstico', 'electrónico', 'cocina', 'heladera', 'microondas',
      'herramienta', 'ferretería', 'construcción', 'pintura', 'bricolaje'
    ];
    
    // Si el producto contiene palabras irrelevantes, es irrelevante
    if (irrelevantKeywords.some(keyword => productName.includes(keyword))) {
      return true;
    }
    
    // Verificar si la búsqueda es de comida pero el producto no es comida
    const foodSearchTerms = ['pollo', 'carne', 'pescado', 'leche', 'huevo', 'pan', 'arroz', 'papa', 'tomate'];
    const isFoodSearch = foodSearchTerms.some(term => searchTerm.includes(term));
    
    if (isFoodSearch) {
      const nonFoodKeywords = ['alimento para', 'comida para', 'mascota', 'pet', 'medicina', 'ropa', 'electrodoméstico'];
      if (nonFoodKeywords.some(keyword => productName.includes(keyword))) {
        return true;
      }
    }
    
    return false;
  }

  // Función para calcular bonus semántico
  private calculateSemanticBonus(productName: string, searchTerm: string): number {
    let bonus = 0;
    
    // Bonus por categorías semánticas
    const semanticCategories = {
      'carnes': ['pollo', 'carne', 'pescado', 'jamón', 'salchicha', 'chorizo', 'bife', 'lomo'],
      'lácteos': ['leche', 'yogur', 'queso', 'manteca', 'crema', 'mantequilla'],
      'panadería': ['pan', 'galleta', 'tostada', 'factura', 'medialuna', 'croissant'],
      'bebidas': ['agua', 'jugo', 'gaseosa', 'cerveza', 'vino', 'café', 'té'],
      'frutas_verduras': ['tomate', 'cebolla', 'papa', 'zanahoria', 'lechuga', 'banana', 'manzana', 'naranja'],
      'granos': ['arroz', 'fideos', 'avena', 'cereales', 'quinoa', 'lentejas', 'porotos']
    };
    
    // Buscar coincidencias semánticas
    Object.entries(semanticCategories).forEach(([category, terms]) => {
      const searchMatches = terms.filter(term => searchTerm.includes(term));
      const productMatches = terms.filter(term => productName.includes(term));
      
      if (searchMatches.length > 0 && productMatches.length > 0) {
        bonus += 15; // Bonus por coincidencia semántica
      }
    });
    
    return bonus;
  }

  // Función para calcular penalización por irrelevancia
  private calculateIrrelevancePenalty(productName: string, searchTerm: string): number {
    let penalty = 0;
    
    // Penalizar productos que contienen palabras que no coinciden con la búsqueda
    const searchWords = searchTerm.split(' ').filter(w => w.length > 2);
    const nameWords = productName.split(/[\s\-_]+/);
    
    // Si el producto tiene muchas palabras que no coinciden con la búsqueda
    const nonMatchingWords = nameWords.filter(nameWord => 
      !searchWords.some(searchWord => nameWord.includes(searchWord))
    );
    
    if (nonMatchingWords.length > 3) {
      penalty += 20; // Penalizar productos con muchas palabras irrelevantes
    }
    
    return penalty;
  }

  // Función para calcular relevancia del grupo
  calculateGroupRelevance(group: GroupedProduct, searchTerm: string): number {
    let maxRelevance = 0;
    
    // Calcular relevancia para cada producto en el grupo
    group.products.forEach(product => {
      const productRelevance = this.calculateProductRelevance(product, searchTerm);
      maxRelevance = Math.max(maxRelevance, productRelevance);
    });
    
    // También considerar el nombre del grupo
    const groupNameRelevance = this.calculateProductRelevance(
      { canonname: group.display_name, brand: group.brand } as Product, 
      searchTerm
    );
    
    return Math.max(maxRelevance, groupNameRelevance);
  }
  
  // Función para filtrar grupos por stock
  filterByStock(groups: GroupedProduct[], onlyInStock: boolean = false): GroupedProduct[] {
    if (!onlyInStock) return groups;
    return groups.filter(group => group.has_stock);
  }
  
  // Función para ordenar grupos por relevancia y precio
  sortGroups(groups: GroupedProduct[], searchTerm: string): GroupedProduct[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      // Si no hay término de búsqueda, ordenar solo por precio
      return groups.sort((a, b) => a.min_price - b.min_price);
    }
    
    return groups.sort((a, b) => {
      const relevanceA = this.calculateGroupRelevance(a, searchTerm);
      const relevanceB = this.calculateGroupRelevance(b, searchTerm);
      
      console.log(`📊 Sorting: "${a.display_name}" (${relevanceA.toFixed(1)}) vs "${b.display_name}" (${relevanceB.toFixed(1)})`);
      
      // Primero por relevancia (diferencia significativa)
      const relevanceDiff = Math.abs(relevanceA - relevanceB);
      if (relevanceDiff > 5) { // Solo si hay diferencia significativa
        return relevanceB - relevanceA;
      }
      
      // Si la relevancia es similar, priorizar por:
      // 1. Productos con stock
      if (a.has_stock !== b.has_stock) {
        return b.has_stock ? 1 : -1;
      }
      
      // 2. Más supermercados (más opciones)
      if (a.total_supermarkets !== b.total_supermarkets) {
        return b.total_supermarkets - a.total_supermarkets;
      }
      
      // 3. Precio más barato
      return a.min_price - b.min_price;
    });
  }

  // Función para formatear el nombre del producto con marca
  private hasValidBrand(brand?: string | null): brand is string {
    if (!brand) return false;
    const normalized = brand.trim().toLowerCase();
    if (!normalized) return false;
    return normalized !== 'sin marca' && normalized !== 'sinmarca';
  }

  formatProductNameWithBrand(product: Product | GroupedProduct): string {
    // Verificar que product sea un objeto válido
    if (!product || typeof product !== 'object') {
      return 'Producto sin nombre';
    }
    
    const productName = 'canonname' in product ? product.canonname : product.display_name;
    const brand = 'brand' in product ? product.brand : undefined;
    
    if (!this.hasValidBrand(brand)) {
      return productName || 'Producto sin nombre';
    }
    
    // Capitalizar la marca
    const capitalizedBrand = this.capitalizeBrand(brand);
    
    // SIEMPRE aplicar el formato: "Marca - Nombre del producto"
    // Sin importar si la marca ya está en el nombre
    return `${capitalizedBrand} - ${productName || 'Producto sin nombre'}`;
  }

  // Función específica para SearchResult (interfaz del frontend)
  formatSearchResultName(result: { canonname: string; brand?: string }): string {
    const productName = result.canonname;
    const brand = result.brand;
    
    // Si no hay marca, devolver el nombre original
    if (!this.hasValidBrand(brand)) {
      return productName;
    }
    
    // Capitalizar la marca
    const capitalizedBrand = this.capitalizeBrand(brand);
    
    // FORMATO SIMPLE: Marca capitalizada + nombre del producto
    return `${capitalizedBrand} - ${productName}`;
  }

}

export const productGroupingService = new ProductGroupingService();
