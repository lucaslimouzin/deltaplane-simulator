// Import configurations
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';

// Determine if we're in production based on webpack-injected variable
const isProduction = process.env.IS_PRODUCTION || false;

// Export the appropriate configuration
export const config = isProduction ? prodConfig : devConfig;

// For debugging
//console.log('Active configuration:', config); 