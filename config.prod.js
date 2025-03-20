// Configuration for production environment (Render.com)
const isProduction = process.env.IS_PRODUCTION || false;
const defaultPort = '8000';

export const config = {
    server: {
        port: defaultPort,
        websocketPort: defaultPort,
        host: isProduction ? '0.0.0.0' : 'localhost'
    },
    websocket: {
        protocol: window?.location?.protocol === 'https:' ? 'wss:' : 'ws:',
        path: ''
    }
}; 