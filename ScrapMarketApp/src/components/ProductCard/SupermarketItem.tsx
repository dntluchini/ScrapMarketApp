import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { formatPrice } from '../../utils/productNameUtils';

interface SupermarketItemProps {
  item: {
    supermercado: string;
    precio: number;
    stock: boolean;
    url?: string;
  };
  onPress?: () => void;
}

/**
 * Componente optimizado para mostrar un item de supermercado
 * Memoizado para evitar re-renders innecesarios
 */
export const SupermarketItem = React.memo<SupermarketItemProps>(({ 
  item, 
  onPress 
}) => {
  const handleVerPress = async () => {
    if (item.url) {
      try {
        console.log('🔗 Opening URL:', item.url);
        const supported = await Linking.canOpenURL(item.url);
        
        if (supported) {
          await Linking.openURL(item.url);
          console.log('✅ URL opened successfully');
        } else {
          console.log('❌ Cannot open URL:', item.url);
          Alert.alert('Error', 'No se puede abrir este enlace');
        }
      } catch (error) {
        console.error('❌ Error opening URL:', error);
        Alert.alert('Error', 'No se pudo abrir el enlace');
      }
    } else {
      console.log('⚠️ No URL available for this item');
      Alert.alert('Información', 'No hay enlace disponible para este producto');
    }
    
    // También llamar a onPress si está definido (para compatibilidad)
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={styles.supermarketItem}>
      <View style={styles.supermarketInfo}>
        <Text style={styles.supermarketName}>
          {item.supermercado || 'Sin nombre'}
        </Text>
        <Text style={styles.supermarketPrice}>
          {formatPrice(item.precio)}
        </Text>
      </View>
      <View style={styles.supermarketStatus}>
        <Text style={[
          styles.stock, 
          { color: item.stock ? '#4CAF50' : '#F44336' }
        ]}>
          {item.stock ? 'En stock' : 'Sin Stock'}
        </Text>
        <TouchableOpacity 
          style={styles.verButton}
          onPress={handleVerPress}
        >
          <Text style={styles.verButtonText}>Ver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

SupermarketItem.displayName = 'SupermarketItem';

const styles = StyleSheet.create({
  supermarketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  supermarketPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
  },
  supermarketStatus: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  verButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  verButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});




