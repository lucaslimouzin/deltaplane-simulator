// Configuration for production environment (Render.com)
export const config = {
    server: {
        port: DEFAULT_PORT,
        websocketPort: DEFAULT_PORT,
        host: IS_PRODUCTION ? DEFAULT_HOST : 'localhost'
    },
    websocket: {
        protocol: window?.location?.protocol === 'https:' ? 'wss:' : 'ws:',
        path: ''
    }
}; 