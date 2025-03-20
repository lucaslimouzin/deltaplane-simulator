// En local, on utilise toujours la configuration de développement
import { config as devConfig } from './config.dev.js';

export const config = devConfig;

// Pour le débogage
//console.log('Active configuration:', config); 