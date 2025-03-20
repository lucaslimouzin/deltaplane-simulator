// Configuration for production environment (Render.com)
export const config = {
    server: {
        port: window.DEFAULT_PORT || '8000',
        websocketPort: window.DEFAULT_PORT || '8000',
        host: window.IS_PRODUCTION ? (window.DEFAULT_HOST || '0.0.0.0') : 'localhost'
    },
    websocket: {
        protocol: window?.location?.protocol === 'https:' ? 'wss:' : 'ws:',
        path: ''
    }
}; 