// Import configurations
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';

// Determine if we're running on Render.com
const isRender = process.env.RENDER === 'true';

// Export the appropriate configuration
export const config = isRender ? prodConfig : devConfig;

// For debugging
//console.log('Active configuration:', config); 