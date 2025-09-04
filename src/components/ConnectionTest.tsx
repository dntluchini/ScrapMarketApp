import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { testSupabaseConnection, testProductSearch, showConfigStatus } from '../lib/supabase-test';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const ConnectionTest: React.FC = () => {
  const [connectionResult, setConnectionResult] = useState<TestResult | null>(null);
  const [searchResult, setSearchResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestConnection = async () => {
    setLoading(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionResult(result);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.message);
      }
    } catch (error) {
      const errorResult: TestResult = {
        success: false,
        message: `Unexpected error: ${error}`,
      };
      setConnectionResult(errorResult);
      Alert.alert('❌ Error', errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestSearch = async () => {
    setLoading(true);
    try {
      const result = await testProductSearch('pepitos');
      setSearchResult(result);
      
      if (result.success) {
        Alert.alert('✅ Success', result.message);
      } else {
        Alert.alert('❌ Error', result.message);
      }
    } catch (error) {
      const errorResult: TestResult = {
        success: false,
        message: `Unexpected error: ${error}`,
      };
      setSearchResult(errorResult);
      Alert.alert('❌ Error', errorResult.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShowConfig = () => {
    showConfigStatus();
    Alert.alert(
      '📋 Configuration',
      'Check the console to see the configuration status'
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Connection Tests</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Test Supabase Connection</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleTestConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🔄 Testing...' : '🔍 Test Connection'}
          </Text>
        </TouchableOpacity>
        
        {connectionResult && (
          <View style={[
            styles.result,
            connectionResult.success ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultText}>{connectionResult.message}</Text>
            {connectionResult.details && (
              <Text style={styles.detailsText}>
                {JSON.stringify(connectionResult.details, null, 2)}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Test Product Search</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleTestSearch}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🔄 Searching...' : '🔍 Search "pepitos"'}
          </Text>
        </TouchableOpacity>
        
        {searchResult && (
          <View style={[
            styles.result,
            searchResult.success ? styles.resultSuccess : styles.resultError
          ]}>
            <Text style={styles.resultText}>{searchResult.message}</Text>
            {searchResult.data && (
              <Text style={styles.detailsText}>
                Products found: {searchResult.data.length}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. View Configuration</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleShowConfig}
        >
          <Text style={styles.buttonText}>📋 View Status</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📝 Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Go to your Supabase dashboard{'\n'}
          2. Settings → API{'\n'}
          3. Copy the Project URL and anon key{'\n'}
          4. Update app.json with your credentials{'\n'}
          5. Restart the app
        </Text>
      </View>
    </ScrollView>
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  resultSuccess: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  resultError: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '500',
  },
  detailsText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#666',
  },
  instructions: {
    backgroundColor: '#e9ecef',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
});
