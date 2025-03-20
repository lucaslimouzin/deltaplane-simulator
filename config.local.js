export const config = {
    // Server configuration
    port: 10000,
    websocketPort: 10000,
    host: 'localhost',
    protocol: 'ws:',
    
    // Game configuration
    maxPlayers: 100,
    updateRate: 60,
    interpolationDelay: 100,
    
    // Debug options
    debug: true,
    showCollisionBoxes: false,
    showPlayerNames: true,
    
    // Game physics
    gravity: 9.81,
    airDensity: 1.225,
    windEnabled: true,
    thermalEnabled: true
}; 