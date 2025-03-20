// Configuration pour l'environnement de production (Render.com)
export const config = {
    server: {
        port: process.env.PORT || 8000,
        websocketPort: process.env.PORT || 8000,
        host: process.env.HOST || '0.0.0.0'
    },
    websocket: {
        protocol: window?.location?.protocol === 'https:' ? 'wss:' : 'ws:',
        path: '/ws'
    }
}; 