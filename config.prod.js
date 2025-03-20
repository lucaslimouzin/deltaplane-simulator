// config.prod.js

const DEFAULT_PORT =
    typeof process !== 'undefined' && process.env && process.env.PORT
        ? process.env.PORT
        : 8000;

const HOST =
    typeof process !== 'undefined' && process.env && process.env.HOST
        ? process.env.HOST
        : window.location.hostname;

export const config = {
    server: {
        port: DEFAULT_PORT,
        websocketPort: DEFAULT_PORT,
        host: HOST
    },
    websocket: {
        protocol: window.location.protocol === 'https:' ? 'wss:' : 'ws:',
        path: '/ws'
    }
};
