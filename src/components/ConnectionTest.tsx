import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getEnvironmentConfig, validateConfig } from '../config/environment';

export const ConnectionTest: React.FC = () => {
  const [configStatus, setConfigStatus] = useState<string>('Not tested');
  const [config, setConfig] = useState(getEnvironmentConfig());

  const testConfiguration = () => {
    try {
      const isValid = validateConfig();
      setConfigStatus(isValid ? '✅ Valid' : '❌ Invalid');
      
      if (!isValid) {
        Alert.alert('Configuration Error', 'Please check your environment configuration');
      }
    } catch (error) {
      setConfigStatus('❌ Error');
      Alert.alert('Configuration Error', `Error: ${error}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ScrapMarket App - Connection Test</Text>
      
      <View style={styles.configSection}>
        <Text style={styles.sectionTitle}>Current Configuration:</Text>
        <Text style={styles.configText}>Environment: {config.ENVIRONMENT}</Text>
        <Text style={styles.configText}>API URL: {config.API_BASE_URL}</Text>
        <Text style={styles.configText}>Supabase URL: {config.SUPABASE_URL}</Text>
        <Text style={styles.configText}>Supabase Key: {config.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</Text>
      </View>

      <TouchableOpacity style={styles.testButton} onPress={testConfiguration}>
        <Text style={styles.buttonText}>Test Configuration</Text>
      </TouchableOpacity>

      <Text style={styles.statusText}>Status: {configStatus}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  configSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  configText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
});