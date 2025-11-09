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
export const SupermarketItem = React.memo<SupermarketItemProps>(({ item, onPress }) => {
  const handleVerPress = async () => {
    if (!item.url) {
      Alert.alert('Informaci\u00F3n', 'No hay enlace disponible para este producto');
      onPress?.();
      return;
    }

    try {
      const supported = await Linking.canOpenURL(item.url);

      if (supported) {
        await Linking.openURL(item.url);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'No se pudo abrir el enlace');
    }

    onPress?.();
  };

  return (
    <View style={styles.supermarketItem}>
      <View style={styles.supermarketInfo}>
        <Text style={styles.supermarketName}>{item.supermercado || 'Sin nombre'}</Text>
        <Text style={styles.supermarketPrice}>{formatPrice(item.precio)}</Text>
      </View>
      <View style={styles.supermarketStatus}>
        <Text
          style={[
            styles.stock,
            { color: item.stock ? '#047857' : '#b91c1c' },
          ]}
        >
          {item.stock ? 'En stock' : 'Sin stock'}
        </Text>
        <TouchableOpacity style={styles.verButton} onPress={handleVerPress}>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  supermarketPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  supermarketStatus: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  verButton: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
