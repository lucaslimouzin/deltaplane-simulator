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
        
        // No HTML element reference for connected players
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
            
            // Titre
            const title = document.createElement('h2');
            title.textContent = 'Hang Glider Simulator';
            title.style.marginBottom = '20px';
            title.style.color = '#333';
            
            // Sous-titre
            const subtitle = document.createElement('p');
            subtitle.textContent = '';
            subtitle.style.marginBottom = '20px';
            subtitle.style.color = '#666';
            
            // Champ de saisie du pseudo
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.placeholder = 'Entrez votre pseudo';
            nameInput.style.width = '100%';
            nameInput.style.padding = '10px';
            nameInput.style.marginBottom = '20px';
            nameInput.style.boxSizing = 'border-box';
            nameInput.style.border = '1px solid #ddd';
            nameInput.style.borderRadius = '5px';
            
            // Bouton de connexion
            const playButton = document.createElement('button');
            playButton.textContent = 'Jouer';
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
                    errorMessage.textContent = 'Le pseudo doit contenir au moins 3 caractères';
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
        // Display connection interface and wait for player to enter username
        await this.createLoginUI();
        
        // Connect to WebSocket server using configuration
        const wsProtocol = config.websocket.protocol;
        const wsHost = config.server.host;
        const wsPort = config.server.websocketPort;
        const wsPath = config.websocket.path;
        
        const wsUrl = `${wsProtocol}//${wsHost}:${wsPort}${wsPath}`;
        console.log('Connecting to WebSocket server:', wsUrl);
        
        this.socket = new WebSocket(wsUrl);
        
        // Handle connection opening
        this.socket.onopen = () => {
            console.log('WebSocket connection established');
            
            // Send player information
            this.socket.send(JSON.stringify({
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
            }));
        };
        
        // Gérer les messages reçus
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'connected':
                    this.playerId = data.id;
                    this.playerCount = data.playerCount;
                    this.connected = true;
                    this.updatePlayerCount();
                    console.log(`Connecté avec l'ID: ${this.playerId}`);
                    break;
                    
                case 'playerList':
                    this.playerCount = data.playerCount;
                    this.updatePlayerCount();
                    
                    // Créer les deltaplane des autres joueurs
                    for (const player of data.players) {
                        this.addRemotePlayer(player);
                    }
                    break;
                    
                case 'playerJoined':
                    this.playerCount = data.playerCount;
                    this.updatePlayerCount();
                    this.addRemotePlayer(data);
                    break;
                    
                case 'playerLeft':
                    this.playerCount = data.playerCount;
                    this.updatePlayerCount();
                    this.removeRemotePlayer(data.id);
                    break;
                    
                case 'playerMove':
                    this.updateRemotePlayerPosition(data.id, data.position, data.rotation);
                    this.playerCount = data.playerCount;
                    this.updatePlayerCount();
                    break;
                    
                case 'error':
                    console.error(`Erreur serveur: ${data.message}`);
                    alert(`Erreur: ${data.message}`);
                    break;
            }
        };
        
        // Gérer les erreurs
        this.socket.onerror = (error) => {
            console.error('Erreur WebSocket:', error);
            this.connected = false;
        };
        
        // Gérer la fermeture de la connexion
        this.socket.onclose = () => {
            console.log('Connexion WebSocket fermée');
            this.connected = false;
            
            // Supprimer tous les joueurs distants
            for (const id in this.remotePlayers) {
                this.removeRemotePlayer(id);
            }
        };
    }
    
    /**
     * Met à jour le compteur de joueurs (méthode simplifiée)
     */
    updatePlayerCount() {
        // Ne fait rien, le panneau des joueurs connectés a été supprimé
        console.log(`Nombre de joueurs connectés: ${this.playerCount}`);
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
        
        console.log(`Adding remote player: ${playerData.name} (${playerData.id})`);
        
        // Create a new hang glider for the remote player
        // Use a simplified version to avoid adding terrain elements
        const remotePlayer = {
            mesh: new THREE.Group()
        };
        
        // Create a simplified hang glider model
        this.createSimpleDeltaplane(remotePlayer.mesh);
        
        // Add hang glider to the scene
        this.scene.add(remotePlayer.mesh);
        
        // Position the hang glider
        remotePlayer.mesh.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Orient the hang glider
        remotePlayer.mesh.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        );
        
        // Add text with player name
        const nameTag = this.createPlayerNameTag(playerData.name);
        remotePlayer.mesh.add(nameTag);
        
        // Store remote player
        this.remotePlayers[playerData.id] = {
            deltaplane: remotePlayer,
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
     * Creates a simplified hang glider model
     * @param {THREE.Group} group - The group to add the model to
     */
    createSimpleDeltaplane(group) {
        // Create triangular sail
        const voileGeometry = new THREE.BufferGeometry();
        const voileVertices = new Float32Array([
            0, 0, -5,    // rear point
            -10, 0, 5,   // left corner
            10, 0, 5     // right corner
        ]);
        voileGeometry.setAttribute('position', new THREE.BufferAttribute(voileVertices, 3));
        voileGeometry.computeVertexNormals();
        
        const voileMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, // Red for other players
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const voile = new THREE.Mesh(voileGeometry, voileMaterial);
        voile.castShadow = true;
        group.add(voile);
        
        // Create vertical rectangular structure (mast)
        const structureGeometry = new THREE.BoxGeometry(0.8, 5, 0.8);
        const structureMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x888888,
            flatShading: true,
            metalness: 0.3,
            roughness: 0.7
        });
        
        const structure = new THREE.Mesh(structureGeometry, structureMaterial);
        structure.position.y = -2;
        structure.position.z = 2.5;
        structure.rotation.x = Math.PI / 4;
        structure.castShadow = true;
        group.add(structure);
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
     * Supprime un joueur distant de la scène
     * @param {string} playerId - L'ID du joueur à supprimer
     */
    removeRemotePlayer(playerId) {
        if (this.remotePlayers[playerId]) {
            console.log(`Suppression du joueur distant: ${this.remotePlayers[playerId].name} (${playerId})`);
            
            // Supprimer le deltaplane de la scène
            this.scene.remove(this.remotePlayers[playerId].deltaplane.mesh);
            
            // Supprimer le joueur de la liste
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
     * Envoie la position du joueur local au serveur
     */
    sendPlayerPosition() {
        if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            const now = Date.now();
            
            // Limiter la fréquence des mises à jour
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
     * Déconnecte le joueur du serveur
     */
    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
} 