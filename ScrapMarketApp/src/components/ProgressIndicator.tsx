import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface ProgressIndicatorProps {
  isScraping: boolean;
  elapsedTime: number;
  productCount: number;
  isProgressiveLoading?: boolean;
  dataSaverMode?: boolean;
  dbOnlyMode?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  isScraping,
  elapsedTime,
  productCount,
  isProgressiveLoading = false,
  dataSaverMode = false,
  dbOnlyMode = false,
}) => {
  if (!isScraping) return null;

  const getStatusText = () => {
    if (dbOnlyMode) {
      return 'Buscando en base de datos...';
    }
    if (isProgressiveLoading && productCount > 0) {
      return 'Actualizando precios...';
    }
    if (elapsedTime < 2) {
      return 'Buscando productos...';
    }
    return 'Scrapeando en tiempo real...';
  };

  const getStatusColor = () => {
    if (dbOnlyMode) {
      return '#007bff'; // Azul para modo BD
    }
    if (isProgressiveLoading && productCount > 0) {
      return '#28a745'; // Verde cuando hay resultados
    }
    if (dataSaverMode) {
      return '#6c757d'; // Gris para modo ahorro
    }
    return '#FF9800'; // Naranja para scraping normal
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ActivityIndicator 
          color={getStatusColor()} 
          size="small" 
        />
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.detailText}>
          Tiempo: {elapsedTime}s
        </Text>
        {productCount > 0 && (
          <Text style={styles.detailText}>
            {productCount} productos encontrados
          </Text>
        )}
        {dataSaverMode && (
          <Text style={[styles.detailText, styles.dataSaverText]}>
            Modo ahorro activo
          </Text>
        )}
      </View>
      
      {isProgressiveLoading && productCount > 0 && (
        <View style={styles.progressiveInfo}>
          <Text style={styles.progressiveText}>
            ⚡ Mostrando primeros resultados - actualizando en background
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6c757d',
  },
  dataSaverText: {
    color: '#28a745',
    fontWeight: '600',
  },
  progressiveInfo: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#28a745',
  },
  progressiveText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
});

export default ProgressIndicator;
