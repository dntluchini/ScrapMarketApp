import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CartScreen from '../screens/CartScreen';
import { useCart } from '../hooks/useCart';
import { AnimatedCartBadge } from '../components/AnimatedCartBadge';

// Navigation types
export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetails: { productId: string; productName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Componente wrapper para CartScreen (ya no necesita actualizar badge, se hace en el icon)
function CartScreenWithBadge(props: any) {
  return <CartScreen {...props} />;
}

const APP_BACKGROUND = '#f8f9fa';
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: APP_BACKGROUND,
  },
};

// Main Tab Navigator
function MainTabNavigator() {
  const { totalItems } = useCart();
  
  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: APP_BACKGROUND }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
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
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
          borderBottomWidth: 0,
          borderBottomColor: 'transparent',
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          shadowColor: 'transparent',
        },
        headerShadowVisible: false as boolean,
        headerTransparent: false as boolean,
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold' as const,
        },
        headerBackTitleVisible: false as boolean,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ 
          title: 'Inicio',
          headerTitle: 'ScrapMarket',
          gestureEnabled: true,
          animationEnabled: true,
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ 
          title: 'Buscar',
          headerTitle: 'Buscar Productos',
          gestureEnabled: true,
          animationEnabled: true,
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreenWithBadge}
        options={({ route }) => {
          // Usar una función para que se ejecute cada vez que se renderiza
          return {
            title: 'Carrito',
            headerTitle: 'Mi Carrito',
            gestureEnabled: true,
            animationEnabled: true,
            tabBarIcon: ({ focused, color, size }) => {
              const icon = (
                <Ionicons 
                  name={focused ? 'cart' : 'cart-outline'} 
                  size={size} 
                  color={color} 
                />
              );
              return <AnimatedCartBadge count={totalItems}>{icon}</AnimatedCartBadge>;
            },
          };
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ 
          title: 'Perfil',
          headerTitle: 'Mi Perfil',
          gestureEnabled: true,
          animationEnabled: true,
        }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
            borderBottomWidth: 0,
            borderBottomColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 0,
            shadowColor: 'transparent',
          },
          headerShadowVisible: false as boolean,
          headerTransparent: false as boolean,
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold' as const,
          },
        }}
      >
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
          options={{ headerShown: false as boolean }}
        />
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetailsScreen}
          options={({ route }) => ({
            title: route.params?.productName || 'Detalles del Producto',
            headerBackTitle: 'Atrás',
            gestureEnabled: true,
            animationEnabled: true,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}



