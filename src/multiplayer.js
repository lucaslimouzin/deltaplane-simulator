import * as THREE from 'three';
import { Deltaplane } from './deltaplane.js';

/**
 * Classe gérant les fonctionnalités multijoueur
 */
export class MultiplayerManager {
    /**
     * Crée une instance du gestionnaire multijoueur
     * @param {THREE.Scene} scene - La scène Three.js
     * @param {Deltaplane} localPlayer - Le deltaplane du joueur local
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
        this.updateInterval = 50; // Envoyer les mises à jour toutes les 50ms
        
        // Pas de référence à l'élément HTML pour les joueurs connectés
    }
    
    /**
     * Crée l'interface de connexion
     * @returns {Promise} Une promesse résolue lorsque le joueur se connecte
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
            title.textContent = 'Simulateur de Deltaplane';
            title.style.marginBottom = '20px';
            title.style.color = '#333';
            
            // Sous-titre
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Mode Multijoueur (max 10 joueurs)';
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
     * Connecte le joueur au serveur WebSocket
     */
    async connect() {
        // Afficher l'interface de connexion et attendre que le joueur entre son pseudo
        await this.createLoginUI();
        
        // Se connecter au serveur WebSocket
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.hostname || 'localhost';
        const wsPort = 8001; // Port du serveur WebSocket
        
        this.socket = new WebSocket(`${wsProtocol}//${wsHost}:${wsPort}`);
        
        // Gérer l'ouverture de la connexion
        this.socket.onopen = () => {
            console.log('Connexion WebSocket établie');
            
            // Envoyer les informations du joueur
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
     * Ajoute un joueur distant à la scène
     * @param {Object} playerData - Les données du joueur distant
     */
    addRemotePlayer(playerData) {
        // Vérifier si le joueur existe déjà
        if (this.remotePlayers[playerData.id]) {
            return;
        }
        
        console.log(`Ajout du joueur distant: ${playerData.name} (${playerData.id})`);
        
        // Créer un nouveau deltaplane pour le joueur distant
        // Utiliser une version simplifiée pour éviter d'ajouter des éléments de terrain
        const remotePlayer = {
            mesh: new THREE.Group()
        };
        
        // Créer un modèle simplifié de deltaplane
        this.createSimpleDeltaplane(remotePlayer.mesh);
        
        // Ajouter le deltaplane à la scène
        this.scene.add(remotePlayer.mesh);
        
        // Positionner le deltaplane
        remotePlayer.mesh.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
        );
        
        // Orienter le deltaplane
        remotePlayer.mesh.rotation.set(
            playerData.rotation.x,
            playerData.rotation.y,
            playerData.rotation.z
        );
        
        // Ajouter un texte avec le nom du joueur
        const nameTag = this.createPlayerNameTag(playerData.name);
        remotePlayer.mesh.add(nameTag);
        
        // Stocker le joueur distant
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
     * Crée un modèle simplifié de deltaplane
     * @param {THREE.Group} group - Le groupe auquel ajouter le modèle
     */
    createSimpleDeltaplane(group) {
        // Création de la voile triangulaire
        const voileGeometry = new THREE.BufferGeometry();
        const voileVertices = new Float32Array([
            0, 0, -5,    // pointe arrière
            -10, 0, 5,   // coin gauche
            10, 0, 5     // coin droit
        ]);
        voileGeometry.setAttribute('position', new THREE.BufferAttribute(voileVertices, 3));
        voileGeometry.computeVertexNormals();
        
        const voileMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000, // Rouge pour les autres joueurs
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.7,
            metalness: 0.1
        });
        
        const voile = new THREE.Mesh(voileGeometry, voileMaterial);
        voile.castShadow = true;
        group.add(voile);
        
        // Création de la structure rectangulaire verticale (mât)
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
     * Crée un texte 3D pour afficher le nom du joueur
     * @param {string} name - Le nom du joueur
     * @returns {THREE.Object3D} L'objet 3D contenant le texte
     */
    createPlayerNameTag(name) {
        // Créer un canvas pour le texte
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Dessiner le fond
        context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Dessiner le texte
        context.font = 'bold 24px Arial';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);
        
        // Créer une texture à partir du canvas
        const texture = new THREE.CanvasTexture(canvas);
        
        // Créer un matériau avec la texture
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        // Créer un plan pour afficher le texte
        const geometry = new THREE.PlaneGeometry(5, 1.25);
        const mesh = new THREE.Mesh(geometry, material);
        
        // Positionner le texte au-dessus du deltaplane
        mesh.position.set(0, 5, 0);
        
        // Faire en sorte que le texte soit toujours face à la caméra
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
     * Met à jour la position d'un joueur distant
     * @param {string} playerId - L'ID du joueur à mettre à jour
     * @param {Object} position - La nouvelle position
     * @param {Object} rotation - La nouvelle rotation
     */
    updateRemotePlayerPosition(playerId, position, rotation) {
        const remotePlayer = this.remotePlayers[playerId];
        
        if (remotePlayer) {
            // Stocker la dernière position et rotation connues
            remotePlayer.lastPosition.copy(remotePlayer.deltaplane.mesh.position);
            remotePlayer.lastRotation.copy(remotePlayer.deltaplane.mesh.rotation);
            
            // Définir la position et rotation cibles
            remotePlayer.targetPosition.set(position.x, position.y, position.z);
            remotePlayer.targetRotation.set(rotation.x, rotation.y, rotation.z);
            
            // Réinitialiser le facteur d'interpolation
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
     * Met à jour les positions des joueurs distants avec interpolation
     * @param {number} delta - Le temps écoulé depuis la dernière mise à jour
     */
    update(delta) {
        // Envoyer la position du joueur local
        this.sendPlayerPosition();
        
        // Mettre à jour les positions des joueurs distants
        for (const id in this.remotePlayers) {
            const remotePlayer = this.remotePlayers[id];
            
            // Incrémenter le facteur d'interpolation
            remotePlayer.interpolationFactor += delta * 5; // Ajuster la vitesse d'interpolation
            remotePlayer.interpolationFactor = Math.min(remotePlayer.interpolationFactor, 1);
            
            // Interpoler la position
            remotePlayer.deltaplane.mesh.position.lerpVectors(
                remotePlayer.lastPosition,
                remotePlayer.targetPosition,
                remotePlayer.interpolationFactor
            );
            
            // Interpoler la rotation (plus complexe)
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
            
            // Faire en sorte que le nom du joueur soit toujours face à la caméra
            if (remotePlayer.nameTag) {
                remotePlayer.nameTag.lookAt(this.localPlayer.camera.position);
            }
        }
    }
    
    /**
     * Interpole entre deux angles
     * @param {number} a - Premier angle
     * @param {number} b - Deuxième angle
     * @param {number} t - Facteur d'interpolation (0-1)
     * @returns {number} Angle interpolé
     */
    lerpAngle(a, b, t) {
        // Calculer la différence entre les angles
        let diff = b - a;
        
        // Normaliser la différence
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Interpoler
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