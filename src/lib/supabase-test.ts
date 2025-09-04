import { supabase, supabaseUtils } from './supabase';
import { config, validateConfig } from '../config/environment';

// Function to test Supabase connection
export const testSupabaseConnection = async (): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('📋 Current configuration:', {
      environment: config.ENVIRONMENT,
      apiBaseUrl: config.API_BASE_URL,
      supabaseUrl: config.SUPABASE_URL ? '✅ Configured' : '❌ Not configured',
      supabaseKey: config.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not configured',
    });

    // Validate configuration
    if (!validateConfig()) {
      return {
        success: false,
        message: '❌ Incomplete configuration. Please check Supabase credentials.',
      };
    }

    // Test basic connection with Supabase
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Supabase connection error:', error);
      return {
        success: false,
        message: `❌ Connection error: ${error.message}`,
        details: error,
      };
    }

    console.log('✅ Supabase connection successful');
    console.log('📊 Data received:', data);

    // Test connection with your API (n8n)
    console.log('🔍 Testing API (n8n) connection...');
    try {
      const response = await fetch(`${config.API_BASE_URL}/products?q=test`);
      if (response.ok) {
        console.log('✅ API (n8n) connection successful');
        return {
          success: true,
          message: '✅ All connections working correctly',
          details: {
            supabase: 'Connected',
            api: 'Connected',
            environment: config.ENVIRONMENT,
          },
        };
      } else {
        console.warn('⚠️ API (n8n) not available:', response.status);
        return {
          success: true,
          message: '✅ Supabase connected, but API (n8n) not available',
          details: {
            supabase: 'Connected',
            api: `Error ${response.status}`,
            environment: config.ENVIRONMENT,
          },
        };
      }
    } catch (apiError) {
      console.warn('⚠️ Error connecting with API (n8n):', apiError);
      return {
        success: true,
        message: '✅ Supabase connected, but API (n8n) not available',
        details: {
          supabase: 'Connected',
          api: 'Not available',
          environment: config.ENVIRONMENT,
        },
      };
    }
  } catch (error) {
    console.error('❌ General error:', error);
    return {
      success: false,
      message: `❌ Unexpected error: ${error}`,
      details: error,
    };
  }
};

// Function to test product search
export const testProductSearch = async (query: string = 'pepitos'): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> => {
  try {
    console.log(`🔍 Testing product search: "${query}"`);
    
    const products = await supabaseUtils.searchProducts(query);
    
    if (products.length === 0) {
      return {
        success: false,
        message: `❌ No products found for "${query}"`,
      };
    }

    console.log(`✅ Found ${products.length} products`);
    console.log('📦 First product:', products[0]);

    return {
      success: true,
      message: `✅ Found ${products.length} products`,
      data: products,
    };
  } catch (error) {
    console.error('❌ Search error:', error);
    return {
      success: false,
      message: `❌ Search error: ${error}`,
    };
  }
};

// Function to show configuration status
export const showConfigStatus = (): void => {
  console.log('📋 Configuration status:');
  console.log('================================');
  console.log(`🌍 Environment: ${config.ENVIRONMENT}`);
  console.log(`🔗 API Base URL: ${config.API_BASE_URL}`);
  console.log(`🗄️ Supabase URL: ${config.SUPABASE_URL ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`🔑 Supabase Key: ${config.SUPABASE_ANON_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('================================');
  
  if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
    console.log('⚠️ To configure Supabase:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Settings → API');
    console.log('3. Copy the Project URL and anon key');
    console.log('4. Update app.json with your credentials');
  }
};
