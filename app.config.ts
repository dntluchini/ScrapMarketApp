import type { ConfigContext, ExpoConfig } from '@expo/config';

const DEFAULT_API_BASE_URL = 'http://192.168.1.99:5678';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ScrapMarket App',
  slug: 'scrapmarket-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.scrapmarket.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    package: 'com.scrapmarket.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development',
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    realTimeScraping: process.env.EXPO_PUBLIC_REAL_TIME_SCRAPING ?? 'true',
    offlineMode: process.env.EXPO_PUBLIC_OFFLINE_MODE ?? 'false',
    debugLogging: process.env.EXPO_PUBLIC_DEBUG_LOGGING ?? 'true',
  },
});
