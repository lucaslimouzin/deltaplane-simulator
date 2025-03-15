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
        
        // Système de visualisation du vent - complètement désactivé
        this.windParticles = null;
        this.windParticlesCount = 0;
        this.windParticlesVisible = false;
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
        this.liftCoefficient = 2.0;
        this.dragCoefficient = 0.001;
        this.weight = 100; // kg (pilote + deltaplane)
        this.lastYaw = 0; // Pour suivre la rotation en lacet
        this.minAltitude = 250; // Altitude minimum en mètres (augmentée de 200 à 250)
        
        // Paramètres de vent - désactivés
        this.windEnabled = false;
        this.windDirection = new THREE.Vector3(0, 0, 0);
        this.windSpeed = 0;
        this.windVariation = 0;
        this.thermalStrength = 0;
        this.thermalRadius = 0;
        this.thermalPositions = [];
        
        // Paramètres de collision
        this.terrain = null; // Référence au terrain, sera définie plus tard
        this.isColliding = false; // État de collision
        this.collisionPoint = null; // Point de collision
        this.collisionNormal = null; // Normale à la surface au point de collision
        this.collisionDamage = 0; // Dommages cumulés suite aux collisions
        this.maxCollisionDamage = 100; // Dommages maximum avant destruction
        
        // Ajout de quaternions pour gérer les rotations de manière plus stable
        this.pitchQuaternion = new THREE.Quaternion();
        this.yawQuaternion = new THREE.Quaternion();
        this.rollQuaternion = new THREE.Quaternion();
        this.targetQuaternion = new THREE.Quaternion();
        
        // Axes de rotation
        this.PITCH_AXIS = new THREE.Vector3(1, 0, 0);
        this.YAW_AXIS = new THREE.Vector3(0, 1, 0);
        this.ROLL_AXIS = new THREE.Vector3(0, 0, 1);
        
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
            this.mesh.position.y = this.minAltitude; // Hauteur initiale à l'altitude minimum
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
     * @deprecated Fonctionnalité désactivée
     */
    createWindParticles() {
        // Fonction désactivée
        return;
    }
    
    /**
     * Met à jour le système de particules pour visualiser le vent
     * @deprecated Fonctionnalité désactivée
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     */
    updateWindParticles(delta) {
        // Fonction désactivée
        return;
    }
    
    /**
     * Active ou désactive la visualisation des particules de vent
     * @deprecated Fonctionnalité désactivée
     * @param {boolean} visible - Visibilité des particules
     */
    toggleWindParticlesVisibility(visible) {
        // Fonction désactivée
        return;
    }
    
    /**
     * Réinitialise la position et la vitesse du deltaplane
     */
    resetPosition() {
        this.mesh.position.set(0, this.minAltitude, 0); // Hauteur de réinitialisation à l'altitude minimum
        
        // Réinitialiser la rotation avec des quaternions
        this.mesh.rotation.set(Math.PI / 10, 0, 0);
        this.mesh.quaternion.setFromEuler(this.mesh.rotation);
        
        this.velocity.set(0, 0, 0);
        this.collisionDamage = 0; // Réinitialiser les dommages
    }
    
    /**
     * Met à jour la position et la rotation du deltaplane
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     */
    update(delta) {
        try {
            // Vitesse de rotation pour les contrôles
            const rotationSpeed = 0.8;
            
            // Sauvegarder la rotation en lacet actuelle
            const currentYaw = this.mesh.rotation.y;
            
            // Application des contrôles d'orientation de la voile
            if (this.pitchUp) {
                // Cabrer (lever le nez) pour monter
                this.mesh.rotation.x += 1.0 * delta;
            } else if (this.pitchDown) {
                // Piquer (baisser le nez) pour descendre
                this.mesh.rotation.x -= 1.0 * delta;
            } else {
                // Si aucune touche n'est pressée, revenir progressivement à l'horizontale
                const returnSpeed = 0.5 * delta; // Réduit de 1.0 à 0.5 pour un retour plus doux
                const smoothFactor = 0.1; // Facteur de lissage pour l'interpolation
                
                // Interpolation douce vers 0
                this.mesh.rotation.x += (0 - this.mesh.rotation.x) * smoothFactor;
                
                // Éviter les micro-oscillations près de 0
                if (Math.abs(this.mesh.rotation.x) < 0.01) {
                    this.mesh.rotation.x = 0;
                }
            }
            
            if (this.rollLeft) {
                // Incliner à gauche
                this.mesh.rotation.z += 0.5 * delta;
            } else if (this.rollRight) {
                // Incliner à droite
                this.mesh.rotation.z -= 0.5 * delta;
            } else {
                // Si aucune touche n'est pressée, revenir progressivement à l'horizontale
                const smoothFactor = 0.1; // Même facteur de lissage que pour le pitch
                
                // Interpolation douce vers 0
                this.mesh.rotation.z += (0 - this.mesh.rotation.z) * smoothFactor;
                
                // Éviter les micro-oscillations près de 0
                if (Math.abs(this.mesh.rotation.z) < 0.01) {
                    this.mesh.rotation.z = 0;
                }
            }
            
            // Gestion du lacet avec protection contre les rotations extrêmes
            if (this.yawLeft) {
                const newYaw = this.mesh.rotation.y + rotationSpeed * delta;
                // Normaliser l'angle entre -PI et PI
                this.mesh.rotation.y = Math.atan2(Math.sin(newYaw), Math.cos(newYaw));
            }
            if (this.yawRight) {
                const newYaw = this.mesh.rotation.y - rotationSpeed * delta;
                // Normaliser l'angle entre -PI et PI
                this.mesh.rotation.y = Math.atan2(Math.sin(newYaw), Math.cos(newYaw));
            }
            
            // Limites strictes de rotation pour éviter les positions impossibles
            this.mesh.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.x));
            this.mesh.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.z));
            
            // Vérification supplémentaire pour empêcher le retournement
            const upVector = new THREE.Vector3(0, 1, 0);
            upVector.applyEuler(this.mesh.rotation);
            if (upVector.y < 0) {
                // Corriger l'orientation si le deltaplane est retourné
                this.mesh.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.x));
                this.mesh.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.z));
            }
            
            // Sauvegarder la rotation en lacet pour le prochain frame
            this.lastYaw = this.mesh.rotation.y;
            
            // Calcul de la direction du deltaplane basée sur son orientation
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.mesh.quaternion);
            
            // Calcul de la vitesse relative à l'air (sans tenir compte du vent)
            const airVelocity = this.velocity.clone();
            
            // Vecteur de vent et effet du vent - désactivés
            let windVector = new THREE.Vector3(0, 0, 0);
            let windAngleEffect = 0;
            let windLiftEffect = 0;
            
            // Le vent est désactivé, donc pas d'effet du vent
            // if (this.windEnabled) { ... } - Code supprimé
            
            // Calcul de la vitesse relative à l'air
            const airSpeed = airVelocity.length();
            
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
            
            // Application de la portance - RÉACTIVÉE pour permettre de monter/descendre en cabrant/piquant
            // Amplification de l'effet vertical pour un impact plus prononcé sur l'altitude
            const liftVector = liftDirection.multiplyScalar(liftForce * delta * 3.0); // Multiplié par 3 pour un effet plus fort
            this.velocity.add(liftVector);
            
            // Ajout d'une force verticale directe basée sur l'angle de tangage
            // Cela garantit un effet immédiat sur l'altitude
            const pitchEffect = 200 * Math.sin(this.mesh.rotation.x); // Force verticale directe
            this.velocity.y += pitchEffect * delta;
            
            // Calcul de la traînée (D = 0.5 * rho * v² * S * CD)
            const dragForce = 0.5 * this.airDensity * airSpeed * airSpeed * 
                this.wingArea * this.dragCoefficient;
            
            // Direction de la traînée (opposée à la direction du vol)
            if (airSpeed > 0) {
                const dragDirection = airVelocity.clone().normalize().negate();
                const dragVector = dragDirection.multiplyScalar(dragForce * delta);
                this.velocity.add(dragVector);
            }
            
            // Propulsion constante dans la direction du deltaplane
            const constantPropulsion = 300; // Remis à 300 pour une vitesse d'environ 300 km/h
            
            // Créer un vecteur de direction horizontale (en ignorant la composante Y)
            // Utiliser une direction fixe vers l'avant, indépendante de la rotation en X
            const forwardDirection = new THREE.Vector3(0, 0, -1);
            forwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            const horizontalDirection = new THREE.Vector3(forwardDirection.x, 0, forwardDirection.z).normalize();
            
            // Appliquer la propulsion uniquement horizontalement
            const propulsionVector = horizontalDirection.multiplyScalar(constantPropulsion * delta);
            this.velocity.add(propulsionVector);
            
            // Ne plus stabiliser l'altitude pour permettre de monter/descendre naturellement
            
            // Effet de l'inclinaison latérale (virage)
            // Plus on est incliné, plus on tourne
            const turnFactor = Math.sin(this.mesh.rotation.z) * 2.0;
            
            // Rotation du vecteur vitesse pour simuler un virage
            // Mais seulement si on n'est pas en train de cabrer/piquer
            if (Math.abs(turnFactor) > 0.01) {
                const turnAxis = new THREE.Vector3(0, 1, 0);
                const turnAngle = turnFactor * delta;
                this.velocity.applyAxisAngle(turnAxis, turnAngle);
                
                // Ajout d'une légère rotation en lacet (yaw) pour un virage plus naturel
                // Utiliser un quaternion pour cette rotation pour éviter les problèmes de gimbal lock
                const yawCorrection = new THREE.Quaternion().setFromAxisAngle(this.YAW_AXIS, turnFactor * delta * 0.5);
                this.mesh.quaternion.multiply(yawCorrection);
                
                // Mettre à jour les angles d'Euler après la correction
                this.mesh.rotation.setFromQuaternion(this.mesh.quaternion, 'YXZ');
            }
            
            // Position avant mise à jour pour détecter les collisions
            const previousPosition = this.mesh.position.clone();
            
            // Application de la vitesse à la position
            this.mesh.position.x += this.velocity.x * delta;
            this.mesh.position.y += this.velocity.y * delta;
            this.mesh.position.z += this.velocity.z * delta;
            
            // Vérification de l'altitude minimum
            if (this.mesh.position.y < this.minAltitude) {
                this.mesh.position.y = this.minAltitude;
                
                // Si on descend trop bas, annuler la vitesse verticale négative
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    
                    // Ajouter une légère poussée vers le haut pour éviter de rester collé au sol
                    this.velocity.y += 5;
                }
            }
            
            // Détection de collision avec le terrain
            this.checkTerrainCollision(previousPosition, delta);
            
            // Suppression de la friction pour maintenir une vitesse constante
            // this.velocity.x *= 0.999;
            // this.velocity.z *= 0.999;
            
            // Création ou mise à jour du panneau d'informations de vol (toujours visible)
            let infoDiv = document.getElementById('flight-info');
            if (!infoDiv) {
                infoDiv = document.createElement('div');
                infoDiv.id = 'flight-info';
                infoDiv.style.position = 'absolute';
                infoDiv.style.bottom = '250px'; // Positionné au-dessus des contrôles
                infoDiv.style.left = '20px'; // Positionné à gauche
                infoDiv.style.padding = '10px';
                infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                infoDiv.style.borderRadius = '5px';
                infoDiv.style.color = 'white';
                infoDiv.style.fontFamily = 'Arial, sans-serif';
                infoDiv.style.fontSize = '14px';
                infoDiv.style.fontWeight = 'bold';
                infoDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
                infoDiv.style.zIndex = '1000';
                infoDiv.style.width = '200px';
                infoDiv.style.backdropFilter = 'blur(5px)';
                infoDiv.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                infoDiv.style.maxHeight = '60vh'; // Hauteur maximale réduite
                infoDiv.style.overflowY = 'auto';
                document.body.appendChild(infoDiv);
            }
            
            // Formatage des informations de vol
            const speedKmh = Math.round(airSpeed * 3.6); // m/s en km/h
            const altitude = Math.round(this.mesh.position.y);
            const terrainHeight = this.terrain ? Math.round(this.getTerrainHeightAtPosition(this.mesh.position.x, this.mesh.position.z)) : 0;
            const heightAboveTerrain = Math.round(altitude - terrainHeight);
            const windInfo = this.windEnabled ? 
                `${Math.round(this.windSpeed * 3.6)} km/h (${this.getWindDirectionName()})` : 
                'désactivé';
            const thermalInfo = this.thermalStrength > 0 ? 
                `+${Math.round(this.thermalStrength * 3.6)} km/h` : 
                'Aucun';
            const angleOfAttackDeg = Math.round(angleOfAttack * 180 / Math.PI);
            const inclinaisonDeg = Math.round(this.mesh.rotation.z * 180 / Math.PI);
            
            // Vérifier si les valeurs sont valides (non NaN)
            const validAltitude = isNaN(altitude) ? 0 : altitude;
            const validHeightAboveTerrain = isNaN(heightAboveTerrain) ? 0 : heightAboveTerrain;
            const validSpeedKmh = isNaN(speedKmh) ? 0 : speedKmh;
            const validAngleOfAttackDeg = isNaN(angleOfAttackDeg) ? 0 : angleOfAttackDeg;
            const validInclinaisonDeg = isNaN(inclinaisonDeg) ? 0 : inclinaisonDeg;
            
            // Style pour les étiquettes et les valeurs - format plus compact
            const labelStyle = 'color: #8adbff; display: inline-block; width: 100px; font-size: 13px;';
            const valueStyle = 'color: #ffffff; font-weight: bold; font-size: 13px;';
            const sectionStyle = 'margin-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 5px;';
            
            // Contenu HTML avec mise en forme plus compacte
            infoDiv.innerHTML = `
                <div style="text-align: center; font-size: 14px; margin-bottom: 8px; color: #ffcc00;">INFORMATIONS DE VOL</div>
                <div style="${sectionStyle}">
                    <div><span style="${labelStyle}">Altitude:</span> <span style="${valueStyle}">${validAltitude} m</span></div>
                    <div><span style="${labelStyle}">Hauteur/terrain:</span> <span style="${valueStyle}">${validHeightAboveTerrain} m</span></div>
                </div>
                <div style="${sectionStyle}">
                    <div><span style="${labelStyle}">Vitesse:</span> <span style="${valueStyle}">${validSpeedKmh} km/h</span></div>
                    <div><span style="${labelStyle}">Angle d'attaque:</span> <span style="${valueStyle}">${validAngleOfAttackDeg}°</span></div>
                    <div><span style="${labelStyle}">Inclinaison:</span> <span style="${valueStyle}">${validInclinaisonDeg}°</span></div>
                </div>
                <div style="${sectionStyle}">
                    <div><span style="${labelStyle}">Vent:</span> <span style="${valueStyle}">${windInfo}</span></div>
                    <div><span style="${labelStyle}">Effet du vent:</span> <span style="${valueStyle}">${windAngleEffect > 0 ? 'Pousse à droite' : windAngleEffect < 0 ? 'Pousse à gauche' : 'Neutre'}</span></div>
                    <div><span style="${labelStyle}">Portance:</span> <span style="${valueStyle}">${Math.round(windLiftEffect * 10)}</span></div>
                </div>
                <div>
                    <div><span style="${labelStyle}">Thermique:</span> <span style="${valueStyle}">${thermalInfo}</span></div>
                </div>
            `;
            
            // Changer la couleur en cas de collision
            if (this.isColliding) {
                infoDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
                infoDiv.innerHTML = `
                    <div style="text-align: center; color: #ff0000; font-size: 16px; margin-bottom: 5px;">⚠️ COLLISION! ⚠️</div>
                    <div style="text-align: center; margin-bottom: 5px;">Dommages: ${Math.round(this.collisionDamage)}%</div>
                    ${infoDiv.innerHTML}
                `;
            } else if (heightAboveTerrain < 20) {
                infoDiv.style.backgroundColor = 'rgba(200, 100, 0, 0.7)'; // Avertissement si on est proche du sol
            } else {
                infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
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
        
        // Position de base derrière le deltaplane - plus éloignée
        const offset = new THREE.Vector3(0, 5, 25); // Augmenté la distance de 15 à 25 et la hauteur de 3 à 5
        
        // Appliquer la rotation du deltaplane à l'offset de la caméra
        const rotatedOffset = new THREE.Vector3(
            offset.x * Math.cos(this.mesh.rotation.y) + offset.z * Math.sin(this.mesh.rotation.y),
            offset.y, // Hauteur fixe pour éviter les problèmes
            -offset.x * Math.sin(this.mesh.rotation.y) + offset.z * Math.cos(this.mesh.rotation.y)
        );
        
        // Position cible de la caméra - directement basée sur la position du deltaplane
        const targetPosition = this.mesh.position.clone().add(rotatedOffset);
        
        // Facteur de lissage (plus la valeur est petite, plus le mouvement est doux)
        const smoothFactor = 0.2; // Maintenu pour une réponse rapide
        
        // Interpolation entre la position actuelle et la position cible
        mainCamera.position.lerp(targetPosition, smoothFactor);
        
        // Point vers lequel la caméra regarde (directement sur le deltaplane)
        const lookAtTarget = this.mesh.position.clone();
        
        // Si c'est la première fois qu'on définit currentLookAt
        if (!this.currentLookAt) {
            this.currentLookAt = lookAtTarget.clone();
        } else {
            // Interpolation du point de visée
            this.currentLookAt.lerp(lookAtTarget, smoothFactor);
        }
        
        // La caméra regarde le point interpolé
        mainCamera.lookAt(this.currentLookAt);
        
        // Vérification de sécurité - si la caméra est trop loin, la replacer
        const distanceToTarget = mainCamera.position.distanceTo(this.mesh.position);
        if (distanceToTarget > 100) { // Augmenté la distance maximale de 50 à 100
            console.log("Caméra trop éloignée, repositionnement...");
            mainCamera.position.copy(this.mesh.position).add(new THREE.Vector3(0, 5, 25));
            this.currentLookAt = this.mesh.position.clone();
            mainCamera.lookAt(this.currentLookAt);
        }
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
        return 'Aucun vent';
    }
    
    /**
     * Change la direction et la vitesse du vent - désactivé
     * @param {THREE.Vector3} direction - Direction du vent
     * @param {number} speed - Vitesse du vent en m/s
     */
    setWind(direction, speed) {
        // Fonction désactivée
        return;
    }
    
    /**
     * Active ou désactive le vent - toujours désactivé
     * @param {boolean} enabled - État d'activation du vent
     */
    toggleWind(enabled) {
        this.windEnabled = false;
    }
    
    /**
     * Vérifie s'il y a une collision avec le terrain
     * @param {THREE.Vector3} previousPosition - Position avant la mise à jour
     * @param {number} delta - Temps écoulé depuis la dernière mise à jour
     */
    checkTerrainCollision(previousPosition, delta) {
        if (!this.terrain) return;
        
        // Hauteur du terrain à la position actuelle
        const terrainHeight = this.getTerrainHeightAtPosition(this.mesh.position.x, this.mesh.position.z);
        
        // Vérifier si on est sous le terrain ou très proche du sol
        const isOnGround = this.mesh.position.y <= terrainHeight + 0.5; // 0.5 mètre au-dessus du sol est considéré comme "au sol"
        
        if (isOnGround) {
            // On est en collision avec le terrain ou au sol
            this.isColliding = true;
            
            // Calculer la vitesse d'impact
            const impactSpeed = this.velocity.length();
            const verticalSpeed = Math.abs(this.velocity.y);
            
            // Si on est en train de rouler (vitesse verticale faible)
            const isRolling = verticalSpeed < 3.0; // Moins de 3 m/s en vitesse verticale
            
            if (isRolling) {
                // Mode roulement sur le sol
                this.mesh.position.y = terrainHeight + 0.1; // Maintenir légèrement au-dessus du sol
                
                // Appliquer une friction au sol pour ralentir progressivement
                this.velocity.x *= 0.98;
                this.velocity.z *= 0.98;
                
                // Annuler la vitesse verticale
                this.velocity.y = 0;
                
                // Redresser progressivement le deltaplane pour qu'il soit parallèle au sol
                const targetRotationX = 0;
                const targetRotationZ = 0;
                this.mesh.rotation.x += (targetRotationX - this.mesh.rotation.x) * 0.1;
                this.mesh.rotation.z += (targetRotationZ - this.mesh.rotation.z) * 0.1;
                
                // Réduire les dommages en mode roulement
                if (this.collisionDamage > 0) {
                    this.collisionDamage -= 0.2 * delta;
                    this.collisionDamage = Math.max(0, this.collisionDamage);
                }
            } else {
                // Collision avec impact
                
                // Calculer les dommages en fonction de la vitesse d'impact
                // Plus on va vite, plus les dommages sont importants
                const damageMultiplier = 0.5; // Ajuster selon la difficulté souhaitée
                const newDamage = verticalSpeed * damageMultiplier;
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
        // Terrain vide, hauteur constante à -0.1
        return -0.1;
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