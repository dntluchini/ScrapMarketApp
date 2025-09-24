import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  ScrollView,
  TextInput,
  Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface SearchFilters {
  priceRange: {
    min: number | null;
    max: number | null;
  };
  supermarkets: string[];
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'name';
  inStockOnly: boolean;
}

interface SearchFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: SearchFilters) => void;
  currentFilters: SearchFilters;
}

const SUPERMARKETS = [
  { id: 'carrefour', name: 'Carrefour', color: '#0066CC' },
  { id: 'jumbo', name: 'Jumbo', color: '#FF6B35' },
  { id: 'disco', name: 'Disco', color: '#00A651' },
  { id: 'vea', name: 'Vea', color: '#E31E24' },
];

const SORT_OPTIONS = [
  { id: 'relevance', name: 'Relevancia', icon: 'star' },
  { id: 'price_asc', name: 'Precio: Menor a Mayor', icon: 'arrow-up' },
  { id: 'price_desc', name: 'Precio: Mayor a Menor', icon: 'arrow-down' },
  { id: 'name', name: 'Nombre A-Z', icon: 'text' },
];

export default function SearchFilters({ 
  visible, 
  onClose, 
  onApply, 
  currentFilters 
}: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters);

  const handleSupermarketToggle = (supermarketId: string) => {
    setFilters(prev => ({
      ...prev,
      supermarkets: prev.supermarkets.includes(supermarketId)
        ? prev.supermarkets.filter(id => id !== supermarketId)
        : [...prev.supermarkets, supermarketId]
    }));
  };

  const handlePriceChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFilters(prev => ({
      ...prev,
      priceRange: {
        ...prev.priceRange,
        [field]: numValue
      }
    }));
  };

  const handleSortChange = (sortBy: SearchFilters['sortBy']) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const handleStockToggle = (value: boolean) => {
    setFilters(prev => ({ ...prev, inStockOnly: value }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      priceRange: { min: null, max: null },
      supermarkets: [],
      sortBy: 'relevance',
      inStockOnly: false,
    };
    setFilters(resetFilters);
    onApply(resetFilters);
    onClose();
  };

  const hasActiveFilters = () => {
    return (
      filters.priceRange.min !== null ||
      filters.priceRange.max !== null ||
      filters.supermarkets.length > 0 ||
      filters.sortBy !== 'relevance' ||
      filters.inStockOnly
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filtros</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rango de Precio</Text>
            <View style={styles.priceInputs}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Mínimo</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange.min?.toString() || ''}
                  onChangeText={(value) => handlePriceChange('min', value)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInputContainer}>
                <Text style={styles.priceLabel}>Máximo</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filters.priceRange.max?.toString() || ''}
                  onChangeText={(value) => handlePriceChange('max', value)}
                  placeholder="∞"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Supermarkets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supermercados</Text>
            <View style={styles.supermarketGrid}>
              {SUPERMARKETS.map((supermarket) => (
                <TouchableOpacity
                  key={supermarket.id}
                  style={[
                    styles.supermarketButton,
                    filters.supermarkets.includes(supermarket.id) && styles.supermarketButtonActive
                  ]}
                  onPress={() => handleSupermarketToggle(supermarket.id)}
                >
                  <View style={[
                    styles.supermarketIndicator,
                    { backgroundColor: supermarket.color }
                  ]} />
                  <Text style={[
                    styles.supermarketText,
                    filters.supermarkets.includes(supermarket.id) && styles.supermarketTextActive
                  ]}>
                    {supermarket.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordenar por</Text>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  filters.sortBy === option.id && styles.sortOptionActive
                ]}
                onPress={() => handleSortChange(option.id as SearchFilters['sortBy'])}
              >
                <Ionicons 
                  name={option.icon as any} 
                  size={20} 
                  color={filters.sortBy === option.id ? '#007AFF' : '#666'} 
                />
                <Text style={[
                  styles.sortOptionText,
                  filters.sortBy === option.id && styles.sortOptionTextActive
                ]}>
                  {option.name}
                </Text>
                {filters.sortBy === option.id && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Stock Filter */}
          <View style={styles.section}>
            <View style={styles.stockFilter}>
              <View style={styles.stockFilterLeft}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.stockFilterText}>Solo productos en stock</Text>
              </View>
              <Switch
                value={filters.inStockOnly}
                onValueChange={handleStockToggle}
                trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
                thumbColor={filters.inStockOnly ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={handleApply}
          >
            <Text style={styles.applyButtonText}>
              Aplicar Filtros {hasActiveFilters() && `(${filters.supermarkets.length + (filters.priceRange.min !== null ? 1 : 0) + (filters.priceRange.max !== null ? 1 : 0) + (filters.inStockOnly ? 1 : 0)})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resetButton: {
    padding: 4,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  priceInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceInputContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  supermarketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  supermarketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
    width: '48%',
  },
  supermarketButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  supermarketIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  supermarketText: {
    fontSize: 14,
    color: '#666',
  },
  supermarketTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionActive: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  stockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stockFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockFilterText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  applyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});






