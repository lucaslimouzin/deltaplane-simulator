// config.prod.js

// Configuration for production environment (Render.com)
export const config = {
    server: {
        port: '10000',
        websocketPort: '10000',
        host: 'deltaplane-simulator.onrender.com'
    },
    websocket: {
        protocol: window.location.protocol === 'https:' ? 'wss:' : 'ws:',
        path: ''
    }
};
