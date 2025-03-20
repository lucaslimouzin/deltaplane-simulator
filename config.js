// Import configurations
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';
import { config as localConfig } from './config.local.js';

// Determine the environment
const isProduction = window.location.hostname.includes('onrender.com');
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Export the appropriate configuration based on the environment
let activeConfig;
if (isProduction) {
    activeConfig = prodConfig;
} else if (isDevelopment) {
    activeConfig = localConfig;
} else {
    activeConfig = devConfig;
}

export const config = activeConfig;

// For debugging
console.log('Environment:', isProduction ? 'production' : (isDevelopment ? 'local' : 'development'));
console.log('Active configuration:', config); 