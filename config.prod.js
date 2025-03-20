// config.prod.js
const DEFAULT_PORT = process.env.PORT || 8000;

export const config = {
    server: {
        port: DEFAULT_PORT,
        websocketPort: DEFAULT_PORT,
        host: process.env.HOST || '0.0.0.0'
    },
    websocket: {
        protocol: window?.location?.protocol === 'https:' ? 'wss:' : 'ws:',
        path: '/ws'
    }
};