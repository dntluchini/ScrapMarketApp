import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';

// Define navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  ProductDetails: { product: any };
  CreateAlert: undefined;
  EditAlert: { alert: any };
};

export type TabParamList = {
  Home: undefined;
  Alerts: undefined;
  History: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Alerts" 
        component={AlertsScreen}
        options={{
          tabBarLabel: 'Alerts',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        options={{
          tabBarLabel: 'History',
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack Navigator
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetailsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="CreateAlert" 
          component={AlertsScreen} // TODO: Create CreateAlertScreen
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen 
          name="EditAlert" 
          component={AlertsScreen} // TODO: Create EditAlertScreen
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
