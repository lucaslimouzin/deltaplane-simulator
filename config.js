// Import configurations
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';

// Export the appropriate configuration based on the environment
export const config = window.IS_PRODUCTION ? prodConfig : devConfig;

// For debugging
//console.log('Active configuration:', config); 