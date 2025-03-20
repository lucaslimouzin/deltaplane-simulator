// Import configurations
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';

// Check if we're on Render.com by looking at the hostname
const isProduction = window.location.hostname.includes('onrender.com');

// Export the appropriate configuration based on the environment
export const config = isProduction ? prodConfig : devConfig;

// For debugging
//console.log('Environment:', isProduction ? 'production' : 'development');
//console.log('Active configuration:', config); 