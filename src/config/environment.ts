import Constants from 'expo-constants';

// Environment configuration interface
export interface EnvironmentConfig {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// Function to get environment variables
const getEnvVar = (key: string, defaultValue?: string): string => {
  // In Expo, environment variables are accessed through Constants.expoConfig.extra
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;
  
  if (!value) {
    console.warn(`⚠️ Environment variable ${key} not found`);
  }
  
  return value || '';
};

// Development configuration (local n8n in Docker)
const developmentConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'http://localhost:5678/webhook'),
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'development',
};

// Staging configuration (test VPS)
const stagingConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'https://staging-your-vps.com/webhook'),
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'staging',
};

// Production configuration (final VPS)
const productionConfig: EnvironmentConfig = {
  API_BASE_URL: getEnvVar('apiBaseUrl', 'https://api-your-domain.com/webhook'),
  SUPABASE_URL: getEnvVar('supabaseUrl', ''),
  SUPABASE_ANON_KEY: getEnvVar('supabaseAnonKey', ''),
  ENVIRONMENT: 'production',
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
  const { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } = config;
  
  if (!API_BASE_URL || API_BASE_URL.includes('your-')) {
    console.error('❌ API_BASE_URL not configured correctly');
    return false;
  }
  
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-')) {
    console.error('❌ SUPABASE_URL not configured correctly');
    return false;
  }
  
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-')) {
    console.error('❌ SUPABASE_ANON_KEY not configured correctly');
    return false;
  }
  
  console.log('✅ Configuration validated successfully');
  return true;
};
