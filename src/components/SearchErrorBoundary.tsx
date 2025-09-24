import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchErrorBoundaryProps {
  onRetry: () => void;
  error?: Error;
}

const SearchErrorFallback: React.FC<SearchErrorBoundaryProps> = ({ onRetry, error }) => {
  return (
    <View style={styles.container}>
      <View style={styles.errorContainer}>
        <Ionicons name="search" size={48} color="#FF6B6B" />
        
        <Text style={styles.title}>Error en la búsqueda</Text>
        
        <Text style={styles.message}>
          No pudimos procesar tu búsqueda. 
          Verifica tu conexión e intenta nuevamente.
        </Text>

        {error && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              {error.message}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxWidth: 300,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  debugInfo: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
    width: '100%',
  },
  debugText: {
    fontSize: 11,
    color: '#e74c3c',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchErrorFallback;

