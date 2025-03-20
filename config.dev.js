// Development configuration
export const config = {
    // Server configuration
    port: 8000,
    websocketPort: 8000,  // Using same port for WebSocket
    host: 'localhost',
    protocol: window.location.protocol === 'https:' ? 'wss:' : 'ws:',

    // Game configuration
    debug: true,
    showFPS: true,
    enableShadows: true,
    
    // Terrain configuration
    terrainSize: 1000,
    terrainSegments: 100,
    waterLevel: -10,
    
    // Player configuration
    maxPlayers: 100,
    spawnHeight: 100,
    
    // Physics configuration
    gravity: -9.81,
    airDensity: 1.225,
    dragCoefficient: 0.1,
    liftCoefficient: 1.5
}; 