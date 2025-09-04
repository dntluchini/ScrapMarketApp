import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { ConnectionTest } from './src/components/ConnectionTest';

export default function App() {
  return (
    <View style={styles.container}>
      <ConnectionTest />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
