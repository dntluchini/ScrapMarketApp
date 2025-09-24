import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import AlertsScreen from '../screens/AlertsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetails: { productId: string; productName: string };
  History: { productId: string; productName: string };
  AlertDetails: { alertId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Alerts: undefined;
  History: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Inicio',
          headerTitle: 'ScrapMarket'
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ 
          title: 'Buscar',
          headerTitle: 'Buscar Productos'
        }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{ 
          title: 'Alertas',
          headerTitle: 'Mis Alertas'
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{ 
          title: 'Historial',
          headerTitle: 'Historial de Precios'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Perfil',
          headerTitle: 'Mi Perfil'
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetailsScreen}
          options={({ route }) => ({
            title: route.params?.productName || 'Detalles del Producto',
            headerBackTitle: 'Atrás',
          })}
        />
        <Stack.Screen 
          name="History" 
          component={HistoryScreen}
          options={({ route }) => ({
            title: route.params?.productName || 'Historial de Precios',
            headerBackTitle: 'Atrás',
          })}
        />
        <Stack.Screen 
          name="AlertDetails" 
          component={AlertsScreen}
          options={{
            title: 'Detalles de Alerta',
            headerBackTitle: 'Atrás',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



