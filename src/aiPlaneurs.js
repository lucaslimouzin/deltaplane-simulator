import * as THREE from 'three';
import { Deltaplane } from './deltaplane.js';

export class AIPlaneurManager {
    constructor(scene) {
        this.scene = scene;
        this.planeurs = [];
        this.minPlaneurs = 10;  // Minimum de planeurs à maintenir
        this.spawnInterval = 8000;  // 8s entre chaque tentative de connexion
        this.lastSpawnTime = 0;
        this.spawnRadius = 500;  // Rayon de spawn autour du joueur
        this.minSpawnHeight = 300;  // Hauteur minimale de spawn
        this.maxSpawnHeight = 400;  // Hauteur maximale de spawn
        
        // Paramètres de vol
        this.maxSpeed = 200;  // Vitesse maximale (comme le joueur)
        this.propulsionForce = 150;  // Force de propulsion (comme le joueur)
        this.verticalSpeedUp = 10;  // Vitesse de montée
        this.verticalSpeedDown = 5;  // Vitesse de descente
        
        // Paramètres de simulation de connexion/déconnexion
        this.baseDisconnectChance = 0.00015;
        this.minOnlineTime = 45000;
        this.playerCount = 1;
        this.spawnChance = 0.7;
        
        // La chance de déconnexion augmente avec le nombre de joueurs
        this.getDisconnectChance = (playerCount) => {
            return this.baseDisconnectChance * Math.pow(1.1, playerCount - this.minPlaneurs);
        };
        
        // La chance de spawn diminue avec le nombre de joueurs
        this.getSpawnChance = (playerCount) => {
            if (playerCount < this.minPlaneurs) return 1;
            return this.spawnChance * Math.pow(0.95, playerCount - this.minPlaneurs);
        };
        
        this.connectionTimes = new Map();
    }

    spawnPlaneur(playerPosition) {
        const angle = Math.random() * Math.PI * 2;
        const radius = this.spawnRadius * Math.sqrt(Math.random());
        const x = playerPosition.x + radius * Math.cos(angle);
        const z = playerPosition.z + radius * Math.sin(angle);
        const y = this.minSpawnHeight + Math.random() * (this.maxSpawnHeight - this.minSpawnHeight);

        const planeur = new Deltaplane(this.scene, true);
        planeur.mesh.position.set(x, y, z);

        planeur.isAI = true;
        planeur.targetPosition = new THREE.Vector3();
        planeur.currentState = 'chercher_thermique';
        planeur.stateTimer = 0;
        planeur.rotationSpeed = 0.5 + Math.random() * 0.5;
        planeur.velocity = new THREE.Vector3();  // Vecteur de vitesse
        planeur.lastHeight = y;

        this.connectionTimes.set(planeur, performance.now());
        
        this.playerCount++;
        if (window.deltaplane) {
            window.deltaplane.playerCount = this.playerCount;
        }

        this.planeurs.push(planeur);
        return planeur;
    }

    update(delta, playerPosition, thermalPositions) {
        const currentTime = performance.now();

        // Tentative de spawn de nouveaux planeurs
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            const currentPlayerCount = this.planeurs.length + 1; // +1 pour le joueur principal
            const spawnChance = this.getSpawnChance(currentPlayerCount);
            
            if (Math.random() < spawnChance || currentPlayerCount < this.minPlaneurs) {
                this.spawnPlaneur(playerPosition);
            }
            this.lastSpawnTime = currentTime;
        }

        // Mettre à jour chaque planeur et gérer les déconnexions
        for (let i = this.planeurs.length - 1; i >= 0; i--) {
            const planeur = this.planeurs[i];
            const connectionTime = this.connectionTimes.get(planeur);
            const timeOnline = currentTime - connectionTime;
            
            // Calculer la chance de déconnexion basée sur le nombre actuel de joueurs
            const disconnectChance = this.getDisconnectChance(this.planeurs.length + 1);
            
            // Vérifier les conditions de déconnexion
            const shouldDisconnect = 
                timeOnline > this.minOnlineTime && // Temps minimum en ligne
                Math.random() < disconnectChance && // Chance de déconnexion variable
                this.planeurs.length > this.minPlaneurs; // Ne pas déconnecter si au minimum
            
            // Vérifier si le planeur est trop loin ou doit se déconnecter
            if (shouldDisconnect || planeur.mesh.position.distanceTo(playerPosition) > this.spawnRadius * 2) {
                // Ne pas déconnecter si cela ferait passer en dessous du minimum
                if (this.planeurs.length <= this.minPlaneurs) {
                    // Au lieu de déconnecter, replacer le planeur plus près
                    const angle = Math.random() * Math.PI * 2;
                    const radius = this.spawnRadius * Math.sqrt(Math.random());
                    planeur.mesh.position.set(
                        playerPosition.x + radius * Math.cos(angle),
                        this.minSpawnHeight + Math.random() * (this.maxSpawnHeight - this.minSpawnHeight),
                        playerPosition.z + radius * Math.sin(angle)
                    );
                    // Réinitialiser le temps de connexion
                    this.connectionTimes.set(planeur, currentTime);
                    continue;
                }
                
                // Déconnecter le planeur
                planeur.dispose();
                this.planeurs.splice(i, 1);
                this.connectionTimes.delete(planeur);
                
                // Mettre à jour le compteur de joueurs
                this.playerCount = Math.max(this.minPlaneurs, this.planeurs.length + 1);
                if (window.deltaplane) {
                    window.deltaplane.playerCount = this.playerCount;
                }
                continue;
            }

            this.updatePlaneur(planeur, delta, playerPosition, thermalPositions);
        }
    }

    updatePlaneur(planeur, delta, playerPosition, thermalPositions) {
        planeur.stateTimer += delta;

        // Sauvegarder l'ancienne position pour calculer la direction réelle
        const oldPosition = planeur.mesh.position.clone();

        switch (planeur.currentState) {
            case 'chercher_thermique':
                let closestThermal = null;
                let minDistance = Infinity;
                
                for (const thermal of thermalPositions) {
                    const distance = planeur.mesh.position.distanceTo(thermal);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestThermal = thermal;
                    }
                }

                if (closestThermal) {
                    planeur.targetPosition.copy(closestThermal);
                    if (minDistance < 50) {
                        planeur.currentState = 'monter';
                        planeur.stateTimer = 0;
                    }
                } else {
                    const circleRadius = 200;
                    const angle = planeur.stateTimer * 0.5;
                    planeur.targetPosition.set(
                        playerPosition.x + circleRadius * Math.cos(angle),
                        planeur.mesh.position.y,
                        playerPosition.z + circleRadius * Math.sin(angle)
                    );
                }
                break;

            case 'monter':
                if (planeur.stateTimer > 10 || planeur.mesh.position.y > this.maxSpawnHeight) {
                    planeur.currentState = 'planer';
                    planeur.stateTimer = 0;
                } else {
                    planeur.mesh.position.y += this.verticalSpeedUp * delta;
                }
                break;

            case 'planer':
                if (planeur.mesh.position.y < this.minSpawnHeight) {
                    planeur.currentState = 'chercher_thermique';
                    planeur.stateTimer = 0;
                } else {
                    planeur.mesh.position.y -= this.verticalSpeedDown * delta;
                }
                break;
        }

        // Rotation vers la cible
        this.rotateTowardsTarget(planeur);

        // Application de la propulsion dans la direction du planeur
        const forwardDirection = new THREE.Vector3(0, 0, -1);
        forwardDirection.applyQuaternion(planeur.mesh.quaternion);
        const horizontalDirection = new THREE.Vector3(forwardDirection.x, 0, forwardDirection.z).normalize();

        // Propulsion constante dans la direction du deltaplane
        const currentSpeed = planeur.velocity.length() * 3.6; // Conversion en km/h
        const speedRatio = currentSpeed / this.maxSpeed;
        const propulsionForce = this.propulsionForce * Math.max(0, 1 - speedRatio);

        // Appliquer la propulsion
        const propulsionVector = horizontalDirection.multiplyScalar(propulsionForce * delta);
        planeur.velocity.add(propulsionVector);

        // Limiter la vitesse maximale
        if (currentSpeed > this.maxSpeed) {
            const reduction = this.maxSpeed / currentSpeed;
            planeur.velocity.multiplyScalar(reduction);
        }

        // Ajouter une résistance progressive de l'air
        const airResistance = Math.pow(speedRatio, 2) * 0.02;
        planeur.velocity.multiplyScalar(1 - airResistance);

        // Mettre à jour la position
        planeur.mesh.position.add(planeur.velocity.clone().multiplyScalar(delta));

        // Vérifier si le planeur recule par rapport à sa direction
        const actualMovement = new THREE.Vector3().subVectors(planeur.mesh.position, oldPosition);
        const dot = actualMovement.dot(forwardDirection);
        
        // Si le planeur recule, corriger sa direction
        if (dot < 0 && actualMovement.length() > 0.1) {
            planeur.mesh.rotation.y += Math.PI; // Retourner le planeur de 180 degrés
            planeur.velocity.multiplyScalar(-1); // Inverser la vitesse
        }
    }

    rotateTowardsTarget(planeur) {
        // Calculer l'angle vers la cible
        const direction = new THREE.Vector3();
        direction.subVectors(planeur.targetPosition, planeur.mesh.position);
        
        // Si le planeur a une vitesse significative, utiliser sa direction de mouvement
        if (planeur.velocity.length() > 1) {
            direction.copy(planeur.velocity);
        }
        
        // Calculer l'angle cible en fonction de la direction
        const targetAngle = Math.atan2(-direction.x, -direction.z); // Inversé pour correspondre à la direction du modèle

        // Rotation progressive
        let currentAngle = planeur.mesh.rotation.y;
        let angleDiff = targetAngle - currentAngle;

        // Normaliser la différence d'angle entre -PI et PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Appliquer la rotation avec une vitesse adaptative
        const rotationSpeed = Math.min(Math.abs(angleDiff), planeur.rotationSpeed);
        planeur.mesh.rotation.y += Math.sign(angleDiff) * rotationSpeed;

        // Ajouter une légère inclinaison en virage
        const turnAngle = Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), Math.PI / 6);
        planeur.mesh.rotation.z = -turnAngle * 0.5; // Inclinaison proportionnelle à l'angle de virage
    }

    dispose() {
        // Nettoyer tous les planeurs
        for (const planeur of this.planeurs) {
            planeur.dispose();
        }
        this.planeurs = [];
        this.connectionTimes.clear();
        this.playerCount = this.minPlaneurs; // Réinitialiser le compteur au minimum
        if (window.deltaplane) {
            window.deltaplane.playerCount = this.playerCount;
        }
    }
} 