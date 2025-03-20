// config.prod.js

// Configuration for production environment (Render.com)
export const config = {
    server: {
        port: window.location.port || '10000',
        websocketPort: window.location.port || '10000',
        host: window.location.hostname
    },
    websocket: {
        protocol: window.location.protocol === 'https:' ? 'wss:' : 'ws:',
        path: '/ws'  // Adding a specific path for WebSocket
    }
};
