// Chargeur de configuration qui sélectionne le bon fichier selon l'environnement
import { config as devConfig } from './config.dev.js';
import { config as prodConfig } from './config.prod.js';

const isDevelopment = process.env.NODE_ENV !== 'production';
export const config = isDevelopment ? devConfig : prodConfig;

// Pour le débogage
console.log(`Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log('Active configuration:', config); 