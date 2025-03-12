import * as THREE from 'three';

/**
 * Classe représentant un deltaplane
 */
export class Deltaplane {
    /**
     * Crée une instance de Deltaplane
     * @param {THREE.Scene} scene - La scène Three.js
     */
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.voile = null; // Référence à la voile pour pouvoir la manipuler séparément
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.camera = null;
        this.currentLookAt = null; // Point de visée actuel pour l'interpolation de la caméra
        
        // Système de visualisation du vent - désactivé pour éviter les erreurs WebGL
        this.windParticles = null;
        this.windParticlesCount = 0; // Nombre de particules réduit à 0
        this.windParticlesVisible = false; // Visibilité des particules désactivée
        this.windParticlesData = null;
        
        // Contrôles (uniquement pour l'orientation de la voile)
        this.pitchUp = false;    // Cabrer (lever le nez)
        this.pitchDown = false;  // Piquer (baisser le nez)
        this.rollLeft = false;   // Incliner à gauche
        this.rollRight = false;  // Incliner à droite
        this.yawLeft = false;    // Tourner à gauche
        this.yawRight = false;   // Tourner à droite
        
        // Paramètres de vol
        this.airDensity = 1.2; // kg/m³
        this.wingArea = 15; // m²
        this.liftCoefficient = 0.8;
        this.dragCoefficient = 0.1;
        this.weight = 100; // kg (pilote + deltaplane)
        
        // Paramètres de vent
        this.windEnabled = true;
        this.windDirection = new THREE.Vector3(1, 0, 0); // Direction du vent (est par défaut)
        this.windSpeed = 5; // m/s
        this.windVariation = 0.2; // Variation aléatoire du vent
        this.thermalStrength = 0; // Force des thermiques
        this.thermalRadius = 50; // Rayon des thermiques
        this.thermalPositions = [];
        
        // Paramètres de collision
        this.terrain = null; // Référence au terrain, sera définie plus tard
        this.isColliding = false; // État de collision
        this.collisionPoint = null; // Point de collision
        this.collisionNormal = null; // Normale à la surface au point de collision
        this.collisionDamage = 0; // Dommages cumulés suite aux collisions
        this.maxCollisionDamage = 100; // Dommages maximum avant destruction
        
        // Création du deltaplane
        this.createModel();
        
        // Création des thermiques aléatoires
        this.createThermals();
    }
    
    /**
     * Crée le modèle 3D du deltaplane
     */
    createModel() {
        try {
            // Création d'un groupe pour contenir tous les éléments du deltaplane
            this.mesh = new THREE.Group();
            this.mesh.position.y = 100; // Hauteur initiale
            this.scene.add(this.mesh);
            
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
                color: 0x00ff00,
                side: THREE.DoubleSide,
                flatShading: true, // Activer le flat shading pour un look low poly
                roughness: 0.7,
                metalness: 0.1
            });
            
            this.voile = new THREE.Mesh(voileGeometry, voileMaterial);
            this.voile.castShadow = true;
            this.mesh.add(this.voile);
            
            // Création de la structure rectangulaire verticale (mât)
            // Orientée vers l'avant (direction de la flèche)
            const structureGeometry = new THREE.BoxGeometry(0.8, 5, 0.8);
            const structureMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                flatShading: true, // Activer le flat shading pour un look low poly
                metalness: 0.3,
                roughness: 0.7
            });
            
            const structure = new THREE.Mesh(structureGeometry, structureMaterial);
            // Positionner la structure pour qu'elle parte des roues et pointe vers l'avant
            structure.position.y = -2; // Légèrement au-dessus des roues
            structure.position.z = 2.5; // Vers l'avant (direction de la flèche)
            structure.rotation.x = Math.PI / 4; // Inclinaison vers l'avant
            structure.castShadow = true;
            this.mesh.add(structure);
            
            // Création d'une barre transversale pour le pilote
            const barreTransversaleGeometry = new THREE.BoxGeometry(15, 0.5, 0.5);
            const barreTransversaleMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                flatShading: true, // Activer le flat shading pour un look low poly
                metalness: 0.3,
                roughness: 0.7
            });
            
            const barreTransversale = new THREE.Mesh(barreTransversaleGeometry, barreTransversaleMaterial);
            barreTransversale.position.y = -3; // Au niveau du pilote
            barreTransversale.position.z = 0;
            barreTransversale.castShadow = true;
            this.mesh.add(barreTransversale);
            
            // Création des roues
            const roueGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 8);
            const roueMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                flatShading: true, // Activer le flat shading pour un look low poly
                metalness: 0.2,
                roughness: 0.8
            });
            
            // Création d'un groupe pour les roues
            const rouesGroup = new THREE.Group();
            rouesGroup.position.y = -4.5; // Position verticale des roues
            this.mesh.add(rouesGroup);
            
            // Roue gauche
            const roueGauche = new THREE.Mesh(roueGeometry, roueMaterial);
            roueGauche.rotation.z = Math.PI / 2; // Rotation correcte pour que l'axe soit horizontal
            roueGauche.position.set(-5, 0, 0); // Position à gauche
            roueGauche.castShadow = true;
            rouesGroup.add(roueGauche);
            
            // Roue droite
            const roueDroite = new THREE.Mesh(roueGeometry, roueMaterial);
            roueDroite.rotation.z = Math.PI / 2; // Rotation correcte pour que l'axe soit horizontal
            roueDroite.position.set(5, 0, 0); // Position à droite
            roueDroite.castShadow = true;
            rouesGroup.add(roueDroite);
            
            // Orientation initiale du deltaplane
            this.mesh.rotation.x = Math.PI / 10; // Légère inclinaison vers l'avant
            
            // Ajout d'une caméra à la suite du deltaplane (pour le mode pilotage)
            this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
            this.mesh.add(this.camera);
            this.camera.position.set(0, 2, 10); // Position derrière le deltaplane
            this.camera.lookAt(0, 0, -10);
            
            // Système de particules désactivé
            // this.createWindParticles();
        } catch (error) {
            console.error('Erreur lors de la création du deltaplane:', error);
        }
    }
    
    /**
     * Crée un système de particules pour visualiser les courants de vent
     * Méthode désactivée pour éviter les erreurs WebGL
     */
    createWindParticles() {
        // Méthode désactivée
        console.log('Système de particules désactivé');
    }
    
    /**
     * Met à jour le système de particules pour visualiser le vent
     * Méthode désactivée pour éviter les erreurs WebGL
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     */
    updateWindParticles(delta) {
        // Méthode désactivée
    }
    
    /**
     * Active ou désactive la visualisation des particules de vent
     * Méthode désactivée pour éviter les erreurs WebGL
     * @param {boolean} visible - État de visibilité des particules
     */
    toggleWindParticlesVisibility(visible) {
        // Méthode désactivée
    }
    
    /**
     * Réinitialise la position et la vitesse du deltaplane
     */
    resetPosition() {
        this.mesh.position.set(0, 100, 0);
        this.mesh.rotation.set(Math.PI / 10, 0, 0);
        this.velocity.set(0, 0, 0);
    }
    
    /**
     * Met à jour la position et la rotation du deltaplane
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     * @param {HTMLElement} debugElement - Élément HTML pour afficher des informations de débogage
     */
    update(delta, debugElement) {
        try {
            // Vitesse de rotation pour les contrôles
            const rotationSpeed = 0.8;
            
            // Application des contrôles d'orientation de la voile
            if (this.pitchUp) this.mesh.rotation.x += rotationSpeed * delta;
            if (this.pitchDown) this.mesh.rotation.x -= rotationSpeed * delta;
            if (this.rollLeft) this.mesh.rotation.z += rotationSpeed * delta;
            if (this.rollRight) this.mesh.rotation.z -= rotationSpeed * delta;
            if (this.yawLeft) this.mesh.rotation.y += rotationSpeed * delta;
            if (this.yawRight) this.mesh.rotation.y -= rotationSpeed * delta;
            
            // Limites de rotation pour éviter les positions impossibles
            this.mesh.rotation.x = Math.max(-Math.PI/3, Math.min(Math.PI/2, this.mesh.rotation.x));
            this.mesh.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.z));
            
            // Calcul de la direction du deltaplane basée sur son orientation
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.mesh.quaternion);
            
            // Calcul de la vitesse relative à l'air (en tenant compte du vent)
            const airVelocity = this.velocity.clone();
            
            // Vecteur de vent et effet du vent
            let windVector = new THREE.Vector3(0, 0, 0);
            let windAngleEffect = 0; // Effet du vent sur la rotation
            let windLiftEffect = 0;
            
            // Ajout de l'effet du vent si activé
            if (this.windEnabled) {
                // Variation aléatoire du vent pour plus de réalisme
                const windVariation = new THREE.Vector3(
                    (Math.random() - 0.5) * this.windVariation,
                    (Math.random() - 0.5) * this.windVariation,
                    (Math.random() - 0.5) * this.windVariation
                );
                
                // Vecteur de vent final
                windVector = this.windDirection.clone()
                    .normalize()
                    .multiplyScalar(this.windSpeed)
                    .add(windVariation);
                
                // Soustraction du vecteur de vent de la vitesse relative à l'air
                airVelocity.sub(windVector);
                
                // Calcul de l'angle entre la direction du deltaplane et le vent
                // Direction du deltaplane (avant du deltaplane)
                const deltaplaneForward = direction.clone();
                
                // Direction du vent (d'où il vient)
                const windDir = windVector.clone().normalize().negate();
                
                // Angle entre les deux directions (produit scalaire)
                const dotProduct = deltaplaneForward.dot(windDir);
                
                // Angle entre -1 (vent de face) et 1 (vent arrière)
                // Calcul du produit vectoriel pour déterminer si le vent vient de gauche ou droite
                const crossProduct = new THREE.Vector3().crossVectors(deltaplaneForward, windDir);
                
                // Effet de rotation du vent (plus fort si le vent vient de côté)
                // Si crossProduct.y > 0, le vent vient de gauche, sinon de droite
                windAngleEffect = crossProduct.y * (1 - Math.abs(dotProduct)) * this.windSpeed * 0.02;
                
                // Effet de portance du vent (plus fort si le vent vient de face ou légèrement de côté)
                // Maximum quand le vent est de face (dotProduct = -1)
                windLiftEffect = (1 - Math.max(0, dotProduct)) * this.windSpeed * 0.5;
                
                // Appliquer une rotation en fonction de l'angle du vent
                this.mesh.rotation.y += windAngleEffect * delta;
                
                // Effet des thermiques (colonnes d'air chaud ascendantes)
                this.thermalStrength = 0; // Réinitialisation
                for (const thermalPos of this.thermalPositions) {
                    // Distance horizontale au thermique
                    const horizontalDist = new THREE.Vector2(
                        this.mesh.position.x - thermalPos.x,
                        this.mesh.position.z - thermalPos.z
                    ).length();
                    
                    // Si on est dans un thermique
                    if (horizontalDist < this.thermalRadius) {
                        // Force du thermique basée sur la distance au centre (plus fort au centre)
                        const thermalFactor = 1 - (horizontalDist / this.thermalRadius);
                        this.thermalStrength = 15 * thermalFactor; // Jusqu'à 15 m/s d'ascendance
                        break; // On ne prend en compte que le thermique le plus fort
                    }
                }
                
                // Application de la force des thermiques
                this.velocity.y += this.thermalStrength * delta;
            }
            
            // Calcul de la vitesse relative à l'air
            const airSpeed = airVelocity.length();
            
            // Application de la gravité
            this.velocity.y -= 9.8 * delta; // Gravité
            
            // Calcul de la portance (dépend de l'angle d'attaque et de la vitesse)
            // Angle d'attaque simplifié (basé sur la rotation en x du deltaplane)
            const angleOfAttack = Math.PI / 2 - this.mesh.rotation.x;
            
            // Coefficient de portance qui dépend de l'angle d'attaque
            // Simplifié: maximum à 15 degrés, diminue après
            const effectiveLiftCoef = this.liftCoefficient * 
                Math.sin(2 * angleOfAttack) * 
                Math.min(1, Math.max(0, (Math.PI/6 - Math.abs(angleOfAttack - Math.PI/12)) / (Math.PI/6)));
            
            // Force de portance (L = 0.5 * rho * v² * S * CL)
            // Ajout de l'effet du vent sur la portance
            const liftForce = 0.5 * this.airDensity * airSpeed * airSpeed * 
                this.wingArea * (effectiveLiftCoef + windLiftEffect * delta);
            
            // Direction de la portance (perpendiculaire à la direction du vol)
            const liftDirection = new THREE.Vector3(0, 1, 0);
            liftDirection.applyQuaternion(this.mesh.quaternion);
            
            // Application de la portance
            const liftVector = liftDirection.multiplyScalar(liftForce * delta);
            this.velocity.add(liftVector);
            
            // Calcul de la traînée (D = 0.5 * rho * v² * S * CD)
            const dragForce = 0.5 * this.airDensity * airSpeed * airSpeed * 
                this.wingArea * this.dragCoefficient;
            
            // Direction de la traînée (opposée à la direction du vol)
            if (airSpeed > 0) {
                const dragDirection = airVelocity.clone().normalize().negate();
                const dragVector = dragDirection.multiplyScalar(dragForce * delta);
                this.velocity.add(dragVector);
            }
            
            // Calcul de la force de propulsion basée sur l'orientation du deltaplane
            // Plus le nez est bas, plus on accélère vers l'avant
            const propulsionFactor = Math.max(0, -Math.sin(this.mesh.rotation.x - Math.PI/10));
            const propulsionForce = propulsionFactor * this.weight * 9.8 * 0.5;
            
            // Application de la force de propulsion dans la direction du deltaplane
            const propulsionVector = direction.clone().multiplyScalar(propulsionForce * delta);
            this.velocity.add(propulsionVector);
            
            // Effet de l'inclinaison latérale (virage)
            // Plus on est incliné, plus on tourne
            const turnFactor = Math.sin(this.mesh.rotation.z) * 2.0;
            
            // Rotation du vecteur vitesse pour simuler un virage
            if (Math.abs(turnFactor) > 0.01) {
                const turnAxis = new THREE.Vector3(0, 1, 0);
                const turnAngle = turnFactor * delta;
                this.velocity.applyAxisAngle(turnAxis, turnAngle);
                
                // Ajout d'une légère rotation en lacet (yaw) pour un virage plus naturel
                this.mesh.rotation.y += turnFactor * delta * 0.5;
            }
            
            // Position avant mise à jour pour détecter les collisions
            const previousPosition = this.mesh.position.clone();
            
            // Application de la vitesse à la position
            this.mesh.position.x += this.velocity.x * delta;
            this.mesh.position.y += this.velocity.y * delta;
            this.mesh.position.z += this.velocity.z * delta;
            
            // Détection de collision avec le terrain
            this.checkTerrainCollision(previousPosition, delta, debugElement);
            
            // Friction pour ralentir progressivement
            this.velocity.x *= 0.995;
            this.velocity.z *= 0.995;
            
            // Afficher l'altitude et les informations de vol
            if (debugElement) {
                // Création ou mise à jour des éléments d'information
                let infoDiv = document.getElementById('flight-info');
                if (!infoDiv) {
                    infoDiv = document.createElement('div');
                    infoDiv.id = 'flight-info';
                    infoDiv.style.fontWeight = 'bold';
                    infoDiv.style.fontSize = '1.2em';
                    infoDiv.style.marginTop = '10px';
                    debugElement.appendChild(infoDiv);
                }
                
                // Formatage des informations de vol
                const speedKmh = Math.round(airSpeed * 3.6); // m/s en km/h
                const altitude = Math.round(this.mesh.position.y);
                const terrainHeight = this.terrain ? Math.round(this.getTerrainHeightAtPosition(this.mesh.position.x, this.mesh.position.z)) : 0;
                const heightAboveTerrain = Math.round(altitude - terrainHeight);
                const windInfo = this.windEnabled ? 
                    `Vent: ${Math.round(this.windSpeed * 3.6)} km/h (${this.getWindDirectionName()})` : 
                    'Vent: désactivé';
                const thermalInfo = this.thermalStrength > 0 ? 
                    `Thermique: +${Math.round(this.thermalStrength * 3.6)} km/h` : 
                    '';
                const windEffectInfo = this.windEnabled ? 
                    `Effet du vent: ${windAngleEffect > 0 ? 'Pousse à droite' : windAngleEffect < 0 ? 'Pousse à gauche' : 'Neutre'}, Portance: ${Math.round(windLiftEffect * 10)}` : 
                    '';
                const angleInfo = `Angle d'attaque: ${Math.round(angleOfAttack * 180 / Math.PI)}°, Inclinaison: ${Math.round(this.mesh.rotation.z * 180 / Math.PI)}°`;
                const collisionInfo = this.isColliding ? 
                    `COLLISION! Dommages: ${Math.round(this.collisionDamage)}%` : 
                    `Hauteur au-dessus du terrain: ${heightAboveTerrain} m`;
                
                infoDiv.innerHTML = `
                    <div>Altitude: ${altitude} m</div>
                    <div>${collisionInfo}</div>
                    <div>Vitesse: ${speedKmh} km/h</div>
                    <div>${angleInfo}</div>
                    <div>${windInfo}</div>
                    <div>${windEffectInfo}</div>
                    <div>${thermalInfo}</div>
                `;
                
                // Changer la couleur en cas de collision
                if (this.isColliding) {
                    infoDiv.style.color = 'red';
                } else if (heightAboveTerrain < 20) {
                    infoDiv.style.color = 'orange'; // Avertissement si on est proche du sol
                } else {
                    infoDiv.style.color = 'white';
                }
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du deltaplane:', error);
        }
    }
    
    /**
     * Configure la caméra principale pour suivre le deltaplane
     * @param {THREE.Camera} mainCamera - La caméra principale de la scène
     */
    updateCamera(mainCamera) {
        // Obtenir la direction dans laquelle le deltaplane pointe
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.mesh.quaternion);
        
        // Position de base derrière le deltaplane
        const offset = new THREE.Vector3(0, 10, 30);
        
        // Appliquer la rotation du deltaplane à l'offset de la caméra (mais pas complètement)
        // On garde une partie de la hauteur fixe pour une meilleure visibilité
        const rotatedOffset = new THREE.Vector3(
            offset.x * Math.cos(this.mesh.rotation.y) + offset.z * Math.sin(this.mesh.rotation.y),
            offset.y - 5 * Math.sin(this.mesh.rotation.x), // Ajustement vertical basé sur l'inclinaison
            -offset.x * Math.sin(this.mesh.rotation.y) + offset.z * Math.cos(this.mesh.rotation.y)
        );
        
        // Position cible de la caméra
        const targetPosition = this.mesh.position.clone().add(rotatedOffset);
        
        // Facteur de lissage (plus la valeur est petite, plus le mouvement est doux)
        // Valeur entre 0 et 1, où 1 = pas de lissage, et 0.01 = très lisse
        const smoothFactor = 0.05;
        
        // Interpolation entre la position actuelle et la position cible
        mainCamera.position.lerp(targetPosition, smoothFactor);
        
        // Point vers lequel la caméra regarde (légèrement devant le deltaplane)
        const lookAtTarget = this.mesh.position.clone().add(direction.multiplyScalar(20));
        
        // Si c'est la première fois qu'on définit currentLookAt
        if (!this.currentLookAt) {
            this.currentLookAt = lookAtTarget.clone();
        } else {
            // Interpolation du point de visée
            this.currentLookAt.lerp(lookAtTarget, smoothFactor);
        }
        
        // La caméra regarde le point interpolé
        mainCamera.lookAt(this.currentLookAt);
    }
    
    /**
     * Définit l'état d'une touche de contrôle
     * @param {string} control - Le nom du contrôle à modifier
     * @param {boolean} state - Le nouvel état du contrôle
     */
    setControl(control, state) {
        if (this[control] !== undefined) {
            this[control] = state;
        }
    }
    
    /**
     * Retourne le nom de la direction du vent
     * @returns {string} Nom de la direction du vent
     */
    getWindDirectionName() {
        const dir = this.windDirection.clone().normalize();
        const angle = Math.atan2(dir.z, dir.x) * 180 / Math.PI;
        
        // Conversion de l'angle en points cardinaux
        if (angle >= -22.5 && angle < 22.5) return 'Est';
        if (angle >= 22.5 && angle < 67.5) return 'Sud-Est';
        if (angle >= 67.5 && angle < 112.5) return 'Sud';
        if (angle >= 112.5 && angle < 157.5) return 'Sud-Ouest';
        if (angle >= 157.5 || angle < -157.5) return 'Ouest';
        if (angle >= -157.5 && angle < -112.5) return 'Nord-Ouest';
        if (angle >= -112.5 && angle < -67.5) return 'Nord';
        if (angle >= -67.5 && angle < -22.5) return 'Nord-Est';
        return 'Inconnu';
    }
    
    /**
     * Change la direction et la vitesse du vent
     * @param {THREE.Vector3} direction - Direction du vent
     * @param {number} speed - Vitesse du vent en m/s
     */
    setWind(direction, speed) {
        this.windDirection = direction.normalize();
        this.windSpeed = speed;
    }
    
    /**
     * Active ou désactive le vent
     * @param {boolean} enabled - État d'activation du vent
     */
    toggleWind(enabled) {
        this.windEnabled = enabled;
    }
    
    /**
     * Vérifie s'il y a une collision avec le terrain
     * @param {THREE.Vector3} previousPosition - Position avant la mise à jour
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     * @param {HTMLElement} debugElement - Élément HTML pour afficher des informations de débogage
     */
    checkTerrainCollision(previousPosition, delta, debugElement) {
        if (!this.terrain) return;
        
        // Hauteur du terrain à la position actuelle
        const terrainHeight = this.getTerrainHeightAtPosition(this.mesh.position.x, this.mesh.position.z);
        
        // Vérifier si on est sous le terrain
        if (this.mesh.position.y < terrainHeight) {
            // On est en collision avec le terrain
            this.isColliding = true;
            
            // Calculer la vitesse d'impact
            const impactSpeed = this.velocity.length();
            
            // Calculer les dommages en fonction de la vitesse d'impact
            // Plus on va vite, plus les dommages sont importants
            const damageMultiplier = 0.5; // Ajuster selon la difficulté souhaitée
            const newDamage = impactSpeed * damageMultiplier;
            this.collisionDamage += newDamage;
            
            // Limiter les dommages au maximum
            this.collisionDamage = Math.min(this.collisionDamage, this.maxCollisionDamage);
            
            // Calculer la normale à la surface au point de collision
            // Simplification: on considère que la normale est verticale
            this.collisionNormal = new THREE.Vector3(0, 1, 0);
            
            // Réaction à la collision
            if (this.collisionDamage >= this.maxCollisionDamage) {
                // Deltaplane détruit
                this.velocity.set(0, 0, 0);
                this.mesh.position.y = terrainHeight;
                
                // Le message de crash a été supprimé pour une meilleure expérience utilisateur
            } else {
                // Rebond avec perte d'énergie
                this.mesh.position.y = terrainHeight + 0.1; // Légèrement au-dessus du terrain
                
                // Réflexion de la vitesse par rapport à la normale
                const dot = this.velocity.dot(this.collisionNormal);
                const reflection = this.velocity.clone().sub(
                    this.collisionNormal.clone().multiplyScalar(2 * dot)
                );
                
                // Appliquer une perte d'énergie au rebond
                const energyLoss = 0.5; // 50% de perte d'énergie
                this.velocity.copy(reflection.multiplyScalar(energyLoss));
                
                // Réduction supplémentaire de la vitesse horizontale
                this.velocity.x *= 0.8;
                this.velocity.z *= 0.8;
            }
        } else {
            // Pas de collision
            this.isColliding = false;
            
            // Réduire progressivement les dommages si on n'est pas en collision
            // (réparation automatique légère)
            if (this.collisionDamage > 0) {
                this.collisionDamage -= 0.1 * delta;
                this.collisionDamage = Math.max(0, this.collisionDamage);
            }
        }
    }
    
    /**
     * Calcule la hauteur du terrain à une position donnée
     * @param {number} x - Coordonnée X
     * @param {number} z - Coordonnée Z
     * @returns {number} La hauteur du terrain
     */
    getTerrainHeightAtPosition(x, z) {
        // Fonction simplifiée pour estimer la hauteur
        // Utiliser la même fonction de bruit que pour le terrain
        const perlin = (x, z, scale, amplitude) => {
            const noiseScale = scale;
            return amplitude * Math.sin(x / noiseScale) * Math.cos(z / noiseScale);
        };
        
        let height = 
            perlin(x, z, 150, 15) + 
            perlin(x, z, 75, 8) + 
            perlin(x, z, 30, 4);
        
        // Ajouter les montagnes spécifiques (version simplifiée)
        const specificMountains = [
            { x: 0, z: -500, radius: 800, height: 250 },
            { x: 200, z: -300, radius: 400, height: 350 },
            { x: -800, z: 600, radius: 500, height: 220 },
            { x: 1000, z: 800, radius: 600, height: 280 },
            { x: 1500, z: -200, radius: 700, height: 200 },
            { x: -1200, z: -900, radius: 300, height: 180 },
            { x: 700, z: 1200, radius: 350, height: 190 },
            { x: 0, z: 0, radius: 600, height: 150 },
            { x: -400, z: -700, radius: 350, height: 320 },
            { x: 600, z: -500, radius: 300, height: 280 },
            { x: -600, z: 300, radius: 400, height: 250 },
            { x: 300, z: 600, radius: 350, height: 230 },
        ];
        
        for (const mountain of specificMountains) {
            const dx = x - mountain.x;
            const dz = z - mountain.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < mountain.radius) {
                const factor = 1 - distance / mountain.radius;
                height += mountain.height * Math.pow(factor, 1.8);
            }
        }
        
        // Discrétiser la hauteur pour correspondre au terrain low poly
        const stepSize = 5;
        height = Math.floor(height / stepSize) * stepSize;
        
        return height;
    }
    
    /**
     * Définit la référence au terrain
     * @param {THREE.Mesh} terrain - Le mesh du terrain
     */
    setTerrain(terrain) {
        this.terrain = terrain;
    }
    
    /**
     * Crée des thermiques aléatoires pour la simulation
     */
    createThermals() {
        // Création de quelques thermiques aléatoires
        for (let i = 0; i < 5; i++) {
            this.thermalPositions.push(new THREE.Vector3(
                (Math.random() - 0.5) * 2000,
                0,
                (Math.random() - 0.5) * 2000
            ));
        }
    }
} 