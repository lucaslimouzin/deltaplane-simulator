// Configuration for production environment (Render.com)
export const config = {
    server: {
        port: process.env.PORT || 8000,
        websocketPort: process.env.PORT || 8001,
        host: 'deltaplane-simulator.onrender.com'
    },
    websocket: {
        protocol: 'wss:',
        path: ''
    }
}; 