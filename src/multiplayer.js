import * as THREE from 'three';
import { Deltaplane } from './deltaplane.js';
import { config } from '../config.js';

/**
 * Class managing multiplayer functionality
 */
export class MultiplayerManager {
    /**
     * Creates a multiplayer manager instance
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Deltaplane} localPlayer - The local player's hang glider
     */
    constructor(scene, localPlayer) {
        this.scene = scene;
        this.localPlayer = localPlayer;
        this.socket = null;
        this.connected = false;
        this.playerName = '';
        this.playerId = '';
        this.remotePlayers = {};
        this.playerCount = 0;
        this.lastUpdateTime = 0;
        this.updateInterval = 50; // Send updates every 50ms
        
        // Initialize player count display
        this.initPlayerCountDisplay();
    }
    
    /**
     * Initialize the player count display
     */
    initPlayerCountDisplay() {
        // Create player count element if it doesn't exist
        let playerCountElement = document.getElementById('player-count');
        if (!playerCountElement) {
            playerCountElement = document.createElement('div');
            playerCountElement.id = 'player-count';
            playerCountElement.style.position = 'fixed';
            playerCountElement.style.top = '10px';
            playerCountElement.style.right = '10px';
            playerCountElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            playerCountElement.style.color = 'white';
            playerCountElement.style.padding = '5px 10px';
            playerCountElement.style.borderRadius = '5px';
            playerCountElement.style.fontFamily = 'Arial, sans-serif';
            playerCountElement.style.zIndex = '1000';
        }
    }
    
    /**
     * Creates a multiplayer manager instance
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {Deltaplane} localPlayer - The local player's hang glider
     */
    createLoginUI() {
        return new Promise((resolve) => {
            // Créer l'élément de fond
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.display = 'flex';
            overlay.style.justifyContent = 'center';
            overlay.style.alignItems = 'center';
            overlay.style.zIndex = '1000';
            
            // Créer le formulaire de connexion
            const loginForm = document.createElement('div');
            loginForm.style.backgroundColor = 'white';
            loginForm.style.padding = '20px';
            loginForm.style.borderRadius = '10px';
            loginForm.style.width = '300px';
            loginForm.style.textAlign = 'center';
            
            // Title
            const title = document.createElement('h2');
            title.textContent = 'Hang Glider Simulator';
            title.style.marginBottom = '20px';
            title.style.color = '#333';
            
            // Subtitle
            const subtitle = document.createElement('p');
            subtitle.textContent = '';
            subtitle.style.marginBottom = '20px';
            subtitle.style.color = '#666';
            
            // Input field for username
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Enter your username';
            nameInput.style.width = '100%';
            nameInput.style.padding = '10px';
            nameInput.style.marginBottom = '20px';
            nameInput.style.boxSizing = 'border-box';
            nameInput.style.border = '1px solid #ddd';
            nameInput.style.borderRadius = '5px';
            
            // Connect button
            const playButton = document.createElement('button');
            playButton.textContent = 'Play';
            playButton.style.backgroundColor = '#4CAF50';
            playButton.style.color = 'white';
            playButton.style.padding = '10px 20px';
            playButton.style.border = 'none';
            playButton.style.borderRadius = '5px';
            playButton.style.cursor = 'pointer';
            playButton.style.fontSize = '16px';
            playButton.style.width = '100%';
            
            // Message d'erreur
            const errorMessage = document.createElement('p');
            errorMessage.style.color = 'red';
            errorMessage.style.marginTop = '10px';
            errorMessage.style.display = 'none';
            
            // Ajouter les éléments au formulaire
            loginForm.appendChild(title);
            loginForm.appendChild(subtitle);
            loginForm.appendChild(nameInput);
            loginForm.appendChild(playButton);
            loginForm.appendChild(errorMessage);
            
            // Ajouter le formulaire à l'overlay
            overlay.appendChild(loginForm);
            
            // Ajouter l'overlay au document
            document.body.appendChild(overlay);
            
            // Focus sur le champ de saisie
            nameInput.focus();
            
            // Gérer le clic sur le bouton de connexion
            playButton.addEventListener('click', () => {
                const name = nameInput.value.trim();
                
                if (name.length < 3) {
                    errorMessage.textContent = 'Username must be at least 3 characters long';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                // Stocker le nom du joueur
                this.playerName = name;
                
                // Supprimer l'overlay
                document.body.removeChild(overlay);
                
                // Résoudre la promesse
                resolve(name);
            });
            
            // Gérer la touche Entrée
            nameInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    playButton.click();
                }
            });
        });
    }
    
    /**
     * Connects the player to the WebSocket server
     */
    async connect() {
        try {
            // Display connection interface and wait for player to enter username
            await this.createLoginUI();
            
            // Connect to WebSocket server using configuration
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.host; // inclut le domaine sans numéro de port explicite en production
            const wsPath = '/ws';
            
            const wsUrl = `${wsProtocol}//${wsHost}${wsPath}`;
            
            return new Promise((resolve, reject) => {
                try {
                    this.socket = new WebSocket(wsUrl);
                    
                    // Set timeout for connection
                    const connectionTimeout = setTimeout(() => {
                        reject(new Error('Connection timeout'));
                    }, 5000);
                    
                    // Handle connection opening
                    this.socket.onopen = () => {
                        console.log('Connected to server');
                        clearTimeout(connectionTimeout);
                        
                        // Send player information
                        const authMessage = {
                            type: 'auth',
                            name: this.playerName,
                            position: {
                                x: this.localPlayer.mesh.position.x,
                                y: this.localPlayer.mesh.position.y,
                                z: this.localPlayer.mesh.position.z
                            },
                            rotation: {
                                x: this.localPlayer.mesh.rotation.x,
                                y: this.localPlayer.mesh.rotation.y,
                                z: this.localPlayer.mesh.rotation.z
                            }
                        };
                        this.socket.send(JSON.stringify(authMessage));
                    };
                    
                    // Gérer les messages reçus
                    this.socket.onmessage = (event) => {
                        const data = JSON.parse(event.data);
                        
                        // Special handling for the first 'connected' message to resolve the promise
                        if (data.type === 'connected' && !this.connected) {
                            this.playerId = data.id;
                            this.playerCount = data.playerCount;
                            this.connected = true;
                            this.updatePlayerCount();
                            console.log('Successfully connected to server');
                            resolve();
                        }
                        
                        switch (data.type) {
                            case 'connected':
                                // Already handled above for first connection
                                if (this.connected) {
                                    // Updates for reconnection scenarios
                                    this.playerCount = data.playerCount;
                                    this.updatePlayerCount();
                                }
                                break;
                            
                            case 'playerList':
                                this.playerCount = data.playerCount;
                                this.updatePlayerCount();
                                
                                // Create hang gliders for other players
                                for (const player of data.players) {
                                    this.addRemotePlayer(player);
                                }
                                break;
                            
                            case 'playerJoined':
                                this.playerCount = data.playerCount;
                                this.updatePlayerCount();
                                this.addRemotePlayer(data);
                                console.log('A new player has joined');
                                break;
                            
                            case 'playerLeft':
                                this.playerCount = data.playerCount;
                                this.updatePlayerCount();
                                this.removeRemotePlayer(data.id);
                                console.log('A player has left');
                                break;
                            
                            case 'playerMove':
                                this.updateRemotePlayerPosition(data.id, data.position, data.rotation);
                                this.playerCount = data.playerCount;
                                this.updatePlayerCount();
                                break;
                            
                            case 'error':
                                console.error(`Server error: ${data.message}`);
                                alert(`Error: ${data.message}`);
                                break;
                        }
                    };
                    
                    // Handle errors
                    this.socket.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        this.connected = false;
                        clearTimeout(connectionTimeout);
                        reject(error);
                    };
                    
                    // Handle connection closure
                    this.socket.onclose = (event) => {
                        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
                        this.connected = false;
                        
                        // If we're still waiting for connection, reject the promise
                        if (!this.connected) {
                            clearTimeout(connectionTimeout);
                            reject(new Error(`Connection closed: ${event.reason || 'Unknown reason'}`));
                        }
                        
                        // Remove all remote players
                        for (const id in this.remotePlayers) {
                            this.removeRemotePlayer(id);
                        }
                        
                    };
                } catch (err) {
                    console.error('Error creating WebSocket connection:', err);
                    reject(err);
                }
            });
        } catch (err) {
            console.error('Erreur de connexion:', err);
            throw err;
        }
    }
    
    /**
     * Update player count display
     */
    updatePlayerCount() {
        // Update player count element
        const playerCountElement = document.getElementById('player-count');
        if (playerCountElement) {
            playerCountElement.textContent = `Online: ${this.playerCount}`;
        }
        
        // Update local player's player count
        if (this.localPlayer) {
            this.localPlayer.updatePlayerCount(this.playerCount);
        }
    }
    
    /**
     * Adds a remote player to the scene
     * @param {Object} playerData - Remote player data
     */
    addRemotePlayer(playerData) {
        // Check if player already exists
        if (this.remotePlayers[playerData.id]) {
            return;
        }
        
        console.log('New player joined the game');
        
        // Create a new Deltaplane instance for the remote player
        const remoteDeltaplane = new Deltaplane(this.scene, true);
        
        // Create the 3D model
        remoteDeltaplane.createModel();
        
        // Position the hang glider
        remoteDeltaplane.mesh.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Orient the hang glider
        remoteDeltaplane.mesh.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        );
        
        // Add text with player name
        const nameTag = this.createPlayerNameTag(playerData.name);
        remoteDeltaplane.mesh.add(nameTag);
        
        // Store remote player
        this.remotePlayers[playerData.id] = {
            deltaplane: remoteDeltaplane,
            nameTag: nameTag,
            name: playerData.name,
            lastPosition: new THREE.Vector3(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            ),
            lastRotation: new THREE.Euler(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z
            ),
            targetPosition: new THREE.Vector3(
                playerData.position.x,
                playerData.position.y,
                playerData.position.z
            ),
            targetRotation: new THREE.Euler(
                playerData.rotation.x,
                playerData.rotation.y,
                playerData.rotation.z
            ),
            interpolationFactor: 0
        };
    }
    
    /**
     * Creates 3D text to display player name
     * @param {string} name - Player name
     * @returns {THREE.Object3D} The 3D object containing the text
     */
    createPlayerNameTag(name) {
        // Create canvas for text
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw background
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw text
        context.font = 'bold 24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Create material with texture
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Create plane to display text
        const geometry = new THREE.PlaneGeometry(5, 1.25);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Position text above hang glider
        mesh.position.set(0, 5, 0);
        
        // Make text always face camera
        mesh.rotation.x = -Math.PI / 2;
        
        return mesh;
    }
    
    /**
     * Removes a remote player from the scene
     * @param {string} playerId - ID of the player to remove
     */
    removeRemotePlayer(playerId) {
        if (this.remotePlayers[playerId]) {
            console.log('Player left the game');
            
            // Remove hang glider from scene
            const deltaplane = this.remotePlayers[playerId].deltaplane;
            deltaplane.dispose();
            
            // Remove player from list
            delete this.remotePlayers[playerId];
        }
    }
    
    /**
     * Updates a remote player's position
     * @param {string} playerId - ID of player to update
     * @param {Object} position - New position
     * @param {Object} rotation - New rotation
     */
    updateRemotePlayerPosition(playerId, position, rotation) {
        const remotePlayer = this.remotePlayers[playerId];
        
        if (remotePlayer) {
            // Store last known position and rotation
            remotePlayer.lastPosition.copy(remotePlayer.deltaplane.mesh.position);
            remotePlayer.lastRotation.copy(remotePlayer.deltaplane.mesh.rotation);
            
            // Set target position and rotation
            remotePlayer.targetPosition.set(position.x, position.y, position.z);
            remotePlayer.targetRotation.set(rotation.x, rotation.y, rotation.z);
            
            // Reset interpolation factor
            remotePlayer.interpolationFactor = 0;
        }
    }
    
    /**
     * Sends the local player's position to the server
     */
    sendPlayerPosition() {
        if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            const now = Date.now();
            
            // Limit update frequency
            if (now - this.lastUpdateTime > this.updateInterval) {
                this.lastUpdateTime = now;
                
                this.socket.send(JSON.stringify({
                    type: 'position',
                    position: {
                        x: this.localPlayer.mesh.position.x,
                        y: this.localPlayer.mesh.position.y,
                        z: this.localPlayer.mesh.position.z
                    },
                    rotation: {
                        x: this.localPlayer.mesh.rotation.x,
                        y: this.localPlayer.mesh.rotation.y,
                        z: this.localPlayer.mesh.rotation.z
                    }
                }));
            }
        }
    }
    
    /**
     * Updates remote player positions with interpolation
     * @param {number} delta - Time elapsed since last update
     */
    update(delta) {
        // Send local player position
        this.sendPlayerPosition();
        
        // Update remote player positions
        for (const id in this.remotePlayers) {
            const remotePlayer = this.remotePlayers[id];
            
            // Increment interpolation factor
            remotePlayer.interpolationFactor += delta * 5; // Adjust interpolation speed
            remotePlayer.interpolationFactor = Math.min(remotePlayer.interpolationFactor, 1);
            
            // Interpolate position
            remotePlayer.deltaplane.mesh.position.lerpVectors(
                remotePlayer.lastPosition,
                remotePlayer.targetPosition,
                remotePlayer.interpolationFactor
            );
            
            // Interpolate rotation (more complex)
            remotePlayer.deltaplane.mesh.rotation.x = this.lerpAngle(
                remotePlayer.lastRotation.x,
                remotePlayer.targetRotation.x,
                remotePlayer.interpolationFactor
            );
            
            remotePlayer.deltaplane.mesh.rotation.y = this.lerpAngle(
                remotePlayer.lastRotation.y,
                remotePlayer.targetRotation.y,
                remotePlayer.interpolationFactor
            );
            
            remotePlayer.deltaplane.mesh.rotation.z = this.lerpAngle(
                remotePlayer.lastRotation.z,
                remotePlayer.targetRotation.z,
                remotePlayer.interpolationFactor
            );
            
            // Make player name always face camera
            if (remotePlayer.nameTag) {
                remotePlayer.nameTag.lookAt(this.localPlayer.camera.position);
            }
        }
    }
    
    /**
     * Interpole between two angles
     * @param {number} a - First angle
     * @param {number} b - Second angle
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated angle
     */
    lerpAngle(a, b, t) {
        // Calculate angle difference
        let diff = b - a;
        
        // Normalize difference
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Interpolate
        return a + diff * t;
    }
    
    /**
     * Disconnects the player from the server
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
} 