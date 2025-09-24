import Constants from 'expo-constants';

// Environment configuration interface
export interface EnvironmentConfig {
  // API Configuration
  API_BASE_URL: string;
  API_TIMEOUT: number;
  API_RETRIES: number;
  
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  
  // Environment Info
  ENVIRONMENT: 'development' | 'staging' | 'production';
  
  // Feature Flags
  FEATURES: {
    REAL_TIME_SCRAPING: boolean;
    OFFLINE_MODE: boolean;
    DEBUG_LOGGING: boolean;
  };
}

// Function to get environment variables
const getEnvVar = (key: string, defaultValue?: string): string => {
  // In Expo, environment variables are accessed through Constants.expoConfig.extra
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
  
  // Only log in development
  if (Constants.expoConfig?.extra?.environment === 'development') {
    console.log(`ðŸ”§ getEnvVar(${key}):`, {
      fromExtra: Constants.expoConfig?.extra?.[key],
      fromProcessEnv: process.env[key],
      defaultValue,
      finalValue: value
    });
  }
  
  if (!value) {
    console.warn(`âš ï¸ Environment variable ${key} not found`);
  }
  
  return value || '';
};

// Function to get boolean environment variables
const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
};

// Development configuration (local n8n in Docker)
// NOTE: Use local IP (186.127.125.134) instead of localhost for mobile device access
const developmentConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'http://192.168.0.158:5678/webhook/search-products-complete?q='),
  API_TIMEOUT: 120000, // 2 minutes for scraping
  API_RETRIES: 2,
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'development',
  FEATURES: {
    REAL_TIME_SCRAPING: getBooleanEnvVar('realTimeScraping', true),
    OFFLINE_MODE: getBooleanEnvVar('offlineMode', false),
    DEBUG_LOGGING: getBooleanEnvVar('debugLogging', true),
  },
};

// Staging configuration (test VPS)
// NOTE: Update with your actual VPS domain and ensure n8n is accessible
const stagingConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'https://staging-your-vps.com/webhook/search-products-complete?q='),
  API_TIMEOUT: 60000, // 1 minute for staging
  API_RETRIES: 3,
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'staging',
  FEATURES: {
    REAL_TIME_SCRAPING: getBooleanEnvVar('realTimeScraping', true),
    OFFLINE_MODE: getBooleanEnvVar('offlineMode', false),
    DEBUG_LOGGING: getBooleanEnvVar('debugLogging', false),
  },
};

// Production configuration (final VPS)
// NOTE: Update with your production domain and ensure n8n is accessible
const productionConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'https://api-your-domain.com/webhook/search-products-complete?q='),
  API_TIMEOUT: 30000, // 30 seconds for production
  API_RETRIES: 3,
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'production',
  FEATURES: {
    REAL_TIME_SCRAPING: getBooleanEnvVar('realTimeScraping', true),
    OFFLINE_MODE: getBooleanEnvVar('offlineMode', true),
    DEBUG_LOGGING: getBooleanEnvVar('debugLogging', false),
  },
};

// Function to get configuration based on environment
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const environment = Constants.expoConfig?.extra?.environment || 'development';
  
  switch (environment) {
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
};

// Current configuration
export const config = getEnvironmentConfig();

// Configuration validation
export const validateConfig = (): boolean => {
  const { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, ENVIRONMENT } = config;
  
  if (!API_BASE_URL || API_BASE_URL.includes('your-')) {
    console.error('âŒ API_BASE_URL not configured correctly');
    return false;
  }
  
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-')) {
    console.error('âŒ SUPABASE_URL not configured correctly');
    return false;
  }
  
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-')) {
    console.error('âŒ SUPABASE_ANON_KEY not configured correctly');
    return false;
  }
  
  if (ENVIRONMENT === 'development') {
    console.log('âœ… Development configuration validated successfully');
  } else {
    console.log(`âœ… ${ENVIRONMENT} configuration validated successfully`);
  }
  
  return true;
};

// Helper function to check if feature is enabled
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['FEATURES']): boolean => {
  return config.FEATURES[feature];
};

// Helper function to get API configuration
export const getApiConfig = () => ({
  baseUrl: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  retries: config.API_RETRIES,
});

// Helper function to get Supabase configuration
export const getSupabaseConfig = () => ({
  url: config.SUPABASE_URL,
  anonKey: config.SUPABASE_ANON_KEY,
});


