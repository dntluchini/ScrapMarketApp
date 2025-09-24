import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { searchService } from '../services/searchService';
import { GroupedProductCard } from './GroupedProductCard';
import { GroupedProduct } from '../services/productGroupingService';

interface PopularProductsProps {
  onProductSelect?: (query: string) => void;
}

const POPULAR_PRODUCTS_REQUEST_TIMEOUT = 65000; // 65s para acompañar workflows de scraping más lentos

const PopularProducts: React.FC<PopularProductsProps> = ({ onProductSelect }) => {
  const [popularProducts, setPopularProducts] = useState<GroupedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [rotationInfo, setRotationInfo] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<string>('');

  // Sistema de categorÃ­as semÃ¡nticas para evitar productos irrelevantes
  const productCategories = {
    'carnes': {
      name: 'Carnes y ProteÃ­nas',
      icon: 'ðŸ¥©',
      keywords: ['pollo', 'carne', 'pescado', 'jamÃ³n', 'salchicha', 'chorizo', 'bife', 'lomo', 'huevos'],
      searchTerms: ['pollo entero', 'carne molida', 'pescado fresco', 'jamÃ³n cocido', 'huevos frescos']
    },
    'lÃ¡cteos': {
      name: 'LÃ¡cteos',
      icon: 'ðŸ¥›',
      keywords: ['leche', 'yogur', 'queso', 'manteca', 'crema', 'mantequilla'],
      searchTerms: ['leche entera', 'yogur natural', 'queso cremoso', 'manteca', 'queso rallado']
    },
    'panaderÃ­a': {
      name: 'PanaderÃ­a',
      icon: 'ðŸž',
      keywords: ['pan', 'galleta', 'tostada', 'factura', 'medialuna', 'croissant'],
      searchTerms: ['pan blanco', 'pan integral', 'galletas dulces', 'tostadas', 'facturas']
    },
    'bebidas': {
      name: 'Bebidas',
      icon: 'ðŸ¥¤',
      keywords: ['agua', 'jugo', 'gaseosa', 'cerveza', 'vino', 'cafÃ©', 'tÃ©'],
      searchTerms: ['coca cola', 'sprite', 'agua mineral', 'jugo de naranja', 'cerveza', 'vino tinto']
    },
    'frutas_verduras': {
      name: 'Frutas y Verduras',
      icon: 'ðŸ¥•',
      keywords: ['tomate', 'cebolla', 'papa', 'zanahoria', 'lechuga', 'banana', 'manzana', 'naranja'],
      searchTerms: ['tomate fresco', 'cebolla', 'papa', 'zanahoria', 'lechuga', 'banana', 'manzana', 'naranja']
    },
    'granos': {
      name: 'Granos y Cereales',
      icon: 'ðŸŒ¾',
      keywords: ['arroz', 'fideos', 'avena', 'cereales', 'quinoa', 'lentejas', 'porotos'],
      searchTerms: ['arroz blanco', 'fideos', 'avena', 'cereales', 'quinoa', 'lentejas']
    },
    'condimentos': {
      name: 'Condimentos',
      icon: 'ðŸ§‚',
      keywords: ['aceite', 'sal', 'azÃºcar', 'vinagre', 'mayonesa', 'ketchup', 'mostaza'],
      searchTerms: ['aceite de oliva', 'sal', 'azÃºcar', 'vinagre', 'mayonesa', 'ketchup']
    },
    'snacks': {
      name: 'Snacks',
      icon: 'ðŸ¿',
      keywords: ['papas', 'galletas', 'chocolate', 'caramelos', 'frutos secos', 'chips'],
      searchTerms: ['papas fritas', 'galletas dulces', 'chocolate', 'caramelos', 'frutos secos']
    }
  };

  // FunciÃ³n para seleccionar categorÃ­as rotativas basadas en hora y dÃ­a
  const getRotatedCategories = (): { category: string, searchTerm: string, categoryInfo: any }[] => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, etc.
    
    // Seleccionar categorÃ­as basÃ¡ndose en la hora del dÃ­a
    let selectedCategories: string[] = [];
    
    if (hour >= 6 && hour < 12) {
      // MaÃ±ana: desayuno
      selectedCategories = ['lÃ¡cteos', 'panaderÃ­a', 'bebidas', 'granos'];
      setRotationInfo('Desayuno â€¢ ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } else if (hour >= 12 && hour < 18) {
      // Tarde: almuerzo
      selectedCategories = ['carnes', 'granos', 'frutas_verduras', 'condimentos'];
      setRotationInfo('Almuerzo â€¢ ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } else if (hour >= 18 && hour < 22) {
      // Noche: cena
      selectedCategories = ['carnes', 'lÃ¡cteos', 'frutas_verduras', 'bebidas'];
      setRotationInfo('Cena â€¢ ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      // Madrugada: snacks
      selectedCategories = ['snacks', 'bebidas', 'condimentos', 'panaderÃ­a'];
      setRotationInfo('Snacks â€¢ ' + now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    }
    
    // Agregar categorÃ­as especÃ­ficas del dÃ­a de la semana
    const daySpecificCategories = [
      ['bebidas', 'snacks'], // Domingo
      ['bebidas', 'panaderÃ­a'], // Lunes
      ['lÃ¡cteos', 'frutas_verduras'], // Martes
      ['lÃ¡cteos', 'carnes'], // MiÃ©rcoles
      ['bebidas', 'condimentos'], // Jueves
      ['carnes', 'bebidas'], // Viernes
      ['carnes', 'frutas_verduras'] // SÃ¡bado
    ];
    
    selectedCategories = [...selectedCategories, ...daySpecificCategories[dayOfWeek]];
    
    // Mezclar y seleccionar 4 categorÃ­as Ãºnicas
    const shuffled = selectedCategories.sort(() => 0.5 - Math.random());
    const uniqueCategories = [...new Set(shuffled)].slice(0, 4);
    
    // Convertir a objetos con informaciÃ³n de categorÃ­a y tÃ©rmino de bÃºsqueda
    return uniqueCategories.map(categoryKey => {
      const categoryInfo = productCategories[categoryKey as keyof typeof productCategories];
      // Seleccionar un tÃ©rmino de bÃºsqueda aleatorio de la categorÃ­a
      const randomSearchTerm = categoryInfo.searchTerms[Math.floor(Math.random() * categoryInfo.searchTerms.length)];
      
      return {
        category: categoryKey,
        searchTerm: randomSearchTerm,
        categoryInfo: categoryInfo
      };
    });
  };

  useEffect(() => {
    loadPopularProducts();
    
    // Rotar productos populares cada 30 minutos
    const rotationInterval = setInterval(() => {
      console.log('ðŸ”„ Rotando productos populares automÃ¡ticamente...');
      loadPopularProducts();
    }, 30 * 60 * 1000); // 30 minutos
    
    return () => {
      clearInterval(rotationInterval);
    };
  }, []);

  const loadPopularProducts = async () => {
    setIsLoading(true);
    try {
      console.log('ðŸ“Š Cargando productos populares por categorÃ­as...');
      
      // Obtener categorÃ­as rotativas basadas en la hora y dÃ­a
      const rotatedCategories = getRotatedCategories();
      console.log('ðŸ”„ CategorÃ­as seleccionadas para rotaciÃ³n:', rotatedCategories.map(c => `${c.categoryInfo.icon} ${c.categoryInfo.name}`));
      
      // Buscar solo 2 productos para mejorar performance inicial
      const categoriesToLoad = rotatedCategories.slice(0, 2);
      console.log('ðŸš€ Cargando productos por categorÃ­a:', categoriesToLoad.map(c => c.searchTerm));
      
      // Cargar productos con carga progresiva
      const allProducts: GroupedProduct[] = [];
      
      for (let i = 0; i < categoriesToLoad.length; i++) {
        const categoryData = categoriesToLoad[i];
        const query = categoryData.searchTerm;
        setLoadingProgress(`Cargando ${i + 1}/${categoriesToLoad.length}: ${categoryData.categoryInfo.icon} ${categoryData.categoryInfo.name}`);
        
        try {
          console.log(`ðŸ” Buscando: ${query} (${categoryData.categoryInfo.name})`);
          // Timeout ampliado (65s) para dar margen al scraping/n8n
          const response = await Promise.race([
            searchService.searchProducts(query),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), POPULAR_PRODUCTS_REQUEST_TIMEOUT)
            )
          ]) as any;
          
          // Procesar respuesta inmediatamente
          if (response.status === 'found' && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const firstItem = response.data[0];
            
            if (firstItem && typeof firstItem === 'object' && firstItem.data && Array.isArray(firstItem.data)) {
              const nestedData = firstItem.data;
              
              if (nestedData.length > 0) {
                const firstProduct = nestedData[0];
                
                if (firstProduct && firstProduct.canonid && firstProduct.canonname) {
                  // Procesar y validar supermercados
                  const supermarkets = firstProduct.supermarkets
                    .filter((supermarket: any) => 
                      supermarket && 
                      typeof supermarket === 'object' &&
                      supermarket.super &&
                      typeof supermarket.precio === 'number'
                    )
                    .map((supermarket: any) => ({
                      supermercado: String(supermarket.super),
                      precio: Number(supermarket.precio),
                      stock: Boolean(supermarket.stock),
                      url: String(supermarket.url || ''),
                      capture: String(supermarket.capture || '')
                    }));

                  // Encontrar el supermercado mÃ¡s barato
                  const cheapestSupermarket = supermarkets.length > 0 
                    ? supermarkets.reduce((cheapest: any, current: any) => {
                        return current.precio < cheapest.precio ? current : cheapest;
                      }, supermarkets[0])
                    : null;

                  // Transformar SearchResult a GroupedProduct con informaciÃ³n de categorÃ­a
                  const groupedProduct: GroupedProduct = {
                    ean: firstProduct.ean,
                    brand: firstProduct.brand,
                    exact_weight: firstProduct.exact_weight,
                    min_price: firstProduct.min_price,
                    max_price: firstProduct.max_price,
                    products: cheapestSupermarket ? [cheapestSupermarket] : [],
                    total_supermarkets: supermarkets.length,
                    alternative_names: [],
                    display_name: firstProduct.canonname,
                    has_stock: supermarkets.some((s: any) => s.stock),
                    // NUEVO: InformaciÃ³n de categorÃ­a para el producto popular (propiedades adicionales)
                    category: categoryData.category,
                    categoryInfo: categoryData.categoryInfo,
                    categoryIcon: categoryData.categoryInfo.icon,
                    categoryName: categoryData.categoryInfo.name
                  } as GroupedProduct & {
                    category: string;
                    categoryInfo: any;
                    categoryIcon: string;
                    categoryName: string;
                  };
                  
                  // Agregar producto inmediatamente
                  if (groupedProduct.products.length > 0) {
                    allProducts.push(groupedProduct);
                    setPopularProducts([...allProducts]); // Actualizar UI inmediatamente
                    console.log(`âœ… Producto agregado: ${query} (${categoryData.categoryInfo.icon} ${categoryData.categoryInfo.name})`);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error(`âŒ Error buscando ${query}:`, error);
        }
      }
      
      console.log('âœ… Todas las bÃºsquedas completadas');
      
      console.log(`DEBUG: Final allProducts before setting state:`, allProducts);
      setPopularProducts(allProducts);
      setLastUpdate(new Date());
      console.log(`âœ… Cargados ${allProducts.length} productos populares`);
      
    } catch (error) {
      console.error('âŒ Error cargando productos populares:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductPress = (query: string) => {
    if (onProductSelect) {
      onProductSelect(query);
    }
  };

  const renderProduct = ({ item }: { item: GroupedProduct }) => {
    console.log(`DEBUG: Rendering product in FlatList:`, item);
    return (
      <TouchableOpacity
        onPress={() => handleProductPress(item.display_name)}
        style={styles.productCard}
      >
        <GroupedProductCard
          group={item}
          onPress={() => handleProductPress(item.display_name)}
        />
      </TouchableOpacity>
    );
  };

  const getLastUpdateText = () => {
    if (!lastUpdate) return '';
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Actualizado hace menos de 1 hora';
    if (diffHours === 1) return 'Actualizado hace 1 hora';
    return `Actualizado hace ${diffHours} horas`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={24} color="#007AFF" />
          <Text style={styles.title}>Productos Populares</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#007AFF" size="small" />
          <Text style={styles.loadingText}>
            {loadingProgress || 'Cargando productos populares...'}
          </Text>
        </View>
      </View>
    );
  }

  if (popularProducts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="trending-up" size={24} color="#007AFF" />
          <Text style={styles.title}>Productos Populares</Text>
        </View>
        <TouchableOpacity 
          onPress={loadPopularProducts} 
          style={styles.refreshButton}
          disabled={isLoading}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={isLoading ? "#999" : "#007AFF"} 
          />
        </TouchableOpacity>
      </View>
      
      {rotationInfo && (
        <View style={styles.rotationInfo}>
          <Ionicons name="time" size={14} color="#666" />
          <Text style={styles.rotationText}>{rotationInfo}</Text>
        </View>
      )}
      
      {lastUpdate && (
        <Text style={styles.lastUpdateText}>{getLastUpdateText()}</Text>
      )}
      
      {/* InformaciÃ³n de categorÃ­as activas */}
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryLabel}>CategorÃ­as activas:</Text>
        <View style={styles.categoryTags}>
          {popularProducts.slice(0, 3).map((product, index) => (
            <View key={index} style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>
                {(product as any).categoryIcon} {(product as any).categoryName}
              </Text>
            </View>
          ))}
        </View>
      </View>
      
      <FlatList
        data={popularProducts}
        renderItem={renderProduct}
        keyExtractor={(item, index) => `popular-${item.ean}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  rotationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  rotationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#6c757d',
    paddingHorizontal: 16,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#6c757d',
  },
  productsList: {
    paddingHorizontal: 16,
  },
  productCard: {
    width: 300, // Aumentado para mejor visualizaciÃ³n
    marginRight: 16, // MÃ¡s espacio entre tarjetas
    backgroundColor: '#2C2C2C',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  separator: {
    width: 16,
  },
  categoryInfo: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
    fontWeight: '500',
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTag: {
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  categoryTagText: {
    fontSize: 11,
    color: '#007bff',
    fontWeight: '500',
  },
});

export default PopularProducts;

