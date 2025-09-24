import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alertService, UserAlert } from '../services/alertService';
import { n8nMcpService } from '../services/n8nMcpService';

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const userAlerts = await alertService.getUserAlerts('current-user');
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      Alert.alert('Error', 'No se pudieron cargar las alertas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAlerts();
    setIsRefreshing(false);
  };

  const handleDeleteAlert = async (alertId: string) => {
    Alert.alert(
      'Eliminar Alerta',
      '¿Estás seguro de que quieres eliminar esta alerta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await alertService.deleteAlert(alertId);
              setAlerts(alerts.filter(alert => alert.id !== alertId));
              Alert.alert('Éxito', 'Alerta eliminada correctamente');
            } catch (error) {
              console.error('Error deleting alert:', error);
              Alert.alert('Error', 'No se pudo eliminar la alerta');
            }
          },
        },
      ]
    );
  };

  const handleToggleAlert = async (alert: UserAlert) => {
    try {
      await alertService.updateAlert(alert.id!, {
        ...alert,
        isActive: !alert.isActive,
      });
      
      setAlerts(alerts.map(a => 
        a.id === alert.id ? { ...a, isActive: !a.isActive } : a
      ));
    } catch (error) {
      console.error('Error updating alert:', error);
      Alert.alert('Error', 'No se pudo actualizar la alerta');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderAlert = ({ item }: { item: UserAlert }) => (
    <View style={styles.alertCard}>
      <View style={styles.alertHeader}>
        <View style={styles.alertInfo}>
          <Text style={styles.productName}>{item.productName}</Text>
          <Text style={styles.targetPrice}>
            Alerta: {formatPrice(item.targetPrice)}
          </Text>
        </View>
        <View style={styles.alertActions}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { backgroundColor: item.isActive ? '#4CAF50' : '#ccc' }
            ]}
            onPress={() => handleToggleAlert(item)}
          >
            <Ionicons 
              name={item.isActive ? 'notifications' : 'notifications-off'} 
              size={16} 
              color="#fff" 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteAlert(item.id!)}
          >
            <Ionicons name="trash" size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.alertDetails}>
        <Text style={styles.alertDate}>
          Creada: {formatDate(item.createdAt || new Date().toISOString())}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.isActive ? '#E8F5E8' : '#F5F5F5' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.isActive ? '#4CAF50' : '#666' }
          ]}>
            {item.isActive ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando alertas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Alertas</Text>
        <Text style={styles.headerSubtitle}>
          {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id || item.canonname}
        style={styles.alertsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              No tienes alertas configuradas
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Crea alertas desde la pantalla de búsqueda para recibir notificaciones cuando los precios bajen
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  alertsList: {
    flex: 1,
    padding: 16,
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  targetPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
  },
  alertDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});