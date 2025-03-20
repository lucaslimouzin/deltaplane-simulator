import * as THREE from 'three';

/**
 * Class representing a hang glider
 */
export class Deltaplane {
    /**
     * Creates a hang glider instance
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {boolean} isRemotePlayer - Whether this is a remote player
     */
    constructor(scene, isRemotePlayer = false) {
        this.scene = scene;
        this.mesh = null;
        this.voile = null; // Reference to the sail for separate manipulation
        this.isRemotePlayer = isRemotePlayer;
        
        // Ces propriétés ne sont nécessaires que pour le joueur local
        if (!isRemotePlayer) {
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.camera = null;
            this.currentLookAt = null;
            

            
            // Controls (only for sail orientation)
            this.pitchUp = false;    // Pitch up (raise nose)
            this.pitchDown = false;  // Pitch down (lower nose)
            this.rollLeft = false;   // Roll left
            this.rollRight = false;  // Roll right
            this.yawLeft = false;    // Turn left
            this.yawRight = false;   // Turn right
            
            // Flight parameters
            this.airDensity = 1.2; // kg/m³
            this.wingArea = 15; // m²
            this.liftCoefficient = 2.0;
            this.dragCoefficient = 0.001;
            this.weight = 100; // kg (pilot + hang glider)
            this.lastYaw = 0; // To track yaw rotation
            this.minAltitude = 250; // Minimum altitude in meters
            this.maxAltitude = 500; // Maximum altitude in meters
            
            // Wind parameters
            this.windEnabled = false;
            this.windDirection = new THREE.Vector3(0, 0, 0);
            this.windSpeed = 0;
            this.windVariation = 0;
            this.thermalStrength = 0;
            this.thermalRadius = 0;
            this.thermalPositions = [];
            
            // Collision parameters
            this.terrain = null;
            this.isColliding = false;
            this.collisionPoint = null;
            this.collisionNormal = null;
            this.collisionDamage = 0;
            this.maxCollisionDamage = 100;
            
            // Add quaternions for more stable rotation handling
            this.pitchQuaternion = new THREE.Quaternion();
            this.yawQuaternion = new THREE.Quaternion();
            this.rollQuaternion = new THREE.Quaternion();
            this.targetQuaternion = new THREE.Quaternion();
            
            // Rotation axes
            this.PITCH_AXIS = new THREE.Vector3(1, 0, 0);
            this.YAW_AXIS = new THREE.Vector3(0, 1, 0);
            this.ROLL_AXIS = new THREE.Vector3(0, 0, 1);
            
            // Variables for FPS calculation
            this.lastTime = performance.now();
            this.currentFPS = 0;
            this.playerCount = 0;
        }
        
        // Create the hang glider model
        this.createModel();
        
        // Create random thermals only for local player
        if (!isRemotePlayer) {
            this.createThermals();
        }
    }
    
    /**
     * Crée le modèle 3D du deltaplane
     */
    createModel() {
        try {
            // Création d'un groupe pour contenir tous les éléments du deltaplane
            this.mesh = new THREE.Group();
            
            // Position initiale différente selon le type de joueur
            this.mesh.position.y = this.minAltitude;
            
            this.scene.add(this.mesh);
            
            // Création de la voile triangulaire
            const voileGeometry = new THREE.BufferGeometry();
            const voileVertices = new Float32Array([
                0, 0, -10,    // pointe avant
                -15, 0, 5,   // coin gauche
                15, 0, 5     // coin droit
            ]);
            voileGeometry.setAttribute('position', new THREE.BufferAttribute(voileVertices, 3));
            voileGeometry.computeVertexNormals();
            
            const voileMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x00ff00, 
                side: THREE.DoubleSide,
                flatShading: true,
                roughness: 0.7,
                metalness: 0.1
            });
            
            this.voile = new THREE.Mesh(voileGeometry, voileMaterial);
            this.voile.castShadow = true;
            this.mesh.add(this.voile);
            
            // Création de l'armature
            const armatureGroup = new THREE.Group();
            
            // Barre horizontale pour le pilote
            const barreGeometry = new THREE.BoxGeometry(20, 0.3, 0.3);
            const barreMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x333333,
                flatShading: true,
                metalness: 0.3,
                roughness: 0.7
            });
            
            const barre = new THREE.Mesh(barreGeometry, barreMaterial);
            barre.position.y = -3;
            barre.position.z = -2;
            barre.castShadow = true;
            armatureGroup.add(barre);

            // Montants verticaux
            const montantGeometry = new THREE.BoxGeometry(0.3, 2.5, 0.3);
            
            // Montant gauche
            const montantGauche = new THREE.Mesh(montantGeometry, barreMaterial);
            montantGauche.position.set(-10, -1.75, -2);
            montantGauche.castShadow = true;
            armatureGroup.add(montantGauche);
            
            // Montant droit
            const montantDroit = new THREE.Mesh(montantGeometry, barreMaterial);
            montantDroit.position.set(10, -1.75, -2);
            montantDroit.castShadow = true;
            armatureGroup.add(montantDroit);
            
            this.mesh.add(armatureGroup);
            
            // Création du personnage (pilote)
            const piloteGroup = new THREE.Group();
            
            // Corps du pilote - plus vertical
            const corpsGeometry = new THREE.CylinderGeometry(1.2, 1.2, 6, 4);
            const corpsMaterial = new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                flatShading: true,
                roughness: 0.8
            });
            const corps = new THREE.Mesh(corpsGeometry, corpsMaterial);
            corps.position.y = -2;
            corps.rotation.x = -Math.PI * 0.1;
            corps.castShadow = true;
            piloteGroup.add(corps);

            // Tête du pilote
            const teteGeometry = new THREE.SphereGeometry(1.2, 4, 4);
            const teteMaterial = new THREE.MeshStandardMaterial({
                color: 0xffdbac,
                flatShading: true,
                roughness: 0.7
            });
            const tete = new THREE.Mesh(teteGeometry, teteMaterial);
            tete.position.y = 1.6;
            tete.castShadow = true;
            piloteGroup.add(tete);

            // Bras du pilote en U
            const brasGeometry = new THREE.CylinderGeometry(0.45, 0.45, 3.6, 3);
            const brasMaterial = new THREE.MeshStandardMaterial({
                color: 0x2244aa,
                flatShading: true,
                roughness: 0.8
            });

            // Bras gauche - partie horizontale
            const brasGaucheHorizontal = new THREE.Mesh(
                new THREE.CylinderGeometry(0.45, 0.45, 2.4, 3),
                brasMaterial
            );
            brasGaucheHorizontal.rotation.z = Math.PI / 2;
            brasGaucheHorizontal.position.set(-1.2, 0, 0);
            brasGaucheHorizontal.castShadow = true;
            piloteGroup.add(brasGaucheHorizontal);

            // Bras gauche - partie verticale
            const brasGaucheVertical = new THREE.Mesh(brasGeometry, brasMaterial);
            brasGaucheVertical.position.set(-2.4, 1.8, 0);
            brasGaucheVertical.castShadow = true;
            piloteGroup.add(brasGaucheVertical);

            // Bras droit - partie horizontale
            const brasDroitHorizontal = new THREE.Mesh(
                new THREE.CylinderGeometry(0.45, 0.45, 2.4, 3),
                brasMaterial
            );
            brasDroitHorizontal.rotation.z = -Math.PI / 2;
            brasDroitHorizontal.position.set(1.2, 0, 0);
            brasDroitHorizontal.castShadow = true;
            piloteGroup.add(brasDroitHorizontal);

            // Bras droit - partie verticale
            const brasDroitVertical = new THREE.Mesh(brasGeometry, brasMaterial);
            brasDroitVertical.position.set(2.4, 1.8, 0);
            brasDroitVertical.castShadow = true;
            piloteGroup.add(brasDroitVertical);

            // Mains du pilote
            const mainGeometry = new THREE.SphereGeometry(0.6, 4, 4);
            const mainMaterial = new THREE.MeshStandardMaterial({
                color: 0xffdbac,
                flatShading: true,
                roughness: 0.7
            });

            // Main gauche
            const mainGauche = new THREE.Mesh(mainGeometry, mainMaterial);
            mainGauche.position.set(-2.4, 3.6, 0);
            mainGauche.castShadow = true;
            piloteGroup.add(mainGauche);

            // Main droite
            const mainDroite = new THREE.Mesh(mainGeometry, mainMaterial);
            mainDroite.position.set(2.4, 3.6, 0);
            mainDroite.castShadow = true;
            piloteGroup.add(mainDroite);

            // Jambes du pilote
            const jambeGeometry = new THREE.CylinderGeometry(0.45, 0.45, 3.6, 3);
            const jambeMaterial = new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                flatShading: true,
                roughness: 0.8
            });

            // Jambe gauche
            const jambeGauche = new THREE.Mesh(jambeGeometry, jambeMaterial);
            jambeGauche.position.set(-0.8, -6, 0);
            jambeGauche.rotation.z = 0;
            jambeGauche.castShadow = true;
            piloteGroup.add(jambeGauche);

            // Jambe droite
            const jambeDroite = new THREE.Mesh(jambeGeometry, jambeMaterial);
            jambeDroite.position.set(0.8, -6, 0);
            jambeDroite.rotation.z = 0;
            jambeDroite.castShadow = true;
            piloteGroup.add(jambeDroite);

            // Position initiale du pilote
            piloteGroup.position.set(0, -6.5, -2);
            this.piloteGroup = piloteGroup;
            this.mesh.add(piloteGroup);

            // S'assurer que le pilote est visible
            piloteGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.visible = true;
                }
            });
            
            // Orientation initiale du deltaplane
            this.mesh.rotation.x = Math.PI / 12;
            
            // Ajout d'une caméra seulement pour le joueur local
            if (!this.isRemotePlayer) {
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
                this.mesh.add(this.camera);
                this.camera.position.set(0, 2, 10);
                this.camera.lookAt(0, 0, -10);
            }

            // Ajout de la méthode pour vérifier la collision avec la voile
            this.checkVoileCollision = () => {
                // Obtenir la position globale de la tête du pilote
                const worldPos = new THREE.Vector3();
                tete.getWorldPosition(worldPos);
                
                // Convertir en coordonnées locales de la voile
                const localPos = worldPos.clone();
                this.voile.worldToLocal(localPos);
                
                // Si la tête est au-dessus de la voile (y > 0), la ramener en dessous
                if (localPos.y > -1) {
                    // Calculer la nouvelle position Y dans l'espace local
                    const newLocalY = -1;
                    
                    // Convertir en coordonnées globales
                    const newWorldPos = new THREE.Vector3(worldPos.x, worldPos.y + (newLocalY - localPos.y), worldPos.z);
                    
                    // Mettre à jour la position du groupe du pilote
                    this.piloteGroup.position.y += (newLocalY - localPos.y);
                }
            };

        } catch (error) {
            console.error('Erreur lors de la création du deltaplane:', error);
        }
    }
    
    
    /**
     * Réinitialise la position et la vitesse du deltaplane
     */
    resetPosition() {
        this.mesh.position.set(0, this.minAltitude, 0); // Hauteur de réinitialisation à l'altitude minimum
        
        // Réinitialiser la rotation avec des quaternions
        this.mesh.rotation.set(Math.PI / 12, 0, 0);
        this.mesh.quaternion.setFromEuler(this.mesh.rotation);
        
        this.velocity.set(0, 0, 0);
        this.collisionDamage = 0; // Réinitialiser les dommages
    }
    
    /**
     * Updates the hang glider's position and rotation
     * @param {number} delta - Time elapsed since last update
     */
    update(delta) {
        try {
            // Calcul des FPS
            const currentTime = performance.now();
            const timeDiff = currentTime - this.lastTime;
            this.currentFPS = Math.round(1000 / timeDiff);
            this.lastTime = currentTime;

            // Vitesse de rotation pour les contrôles
            const rotationSpeed = 0.8;
            
            // Sauvegarder la rotation en lacet actuelle
            const currentYaw = this.mesh.rotation.y;
            
            // Application des contrôles d'orientation de la voile
            if (this.pitchUp) {
                // Pitch up (raise nose) for climb
                this.mesh.rotation.x += 1.0 * delta;
            } else if (this.pitchDown) {
                // Pitch down (lower nose) for descend
                this.mesh.rotation.x -= 1.0 * delta;
            } else {
                // If no key is pressed, gradually return to horizontal
                const returnSpeed = 0.5 * delta; // Reduced from 1.0 to 0.5 for a smoother return
                const smoothFactor = 0.1; // Smoothing factor for interpolation
                
                // Smooth interpolation towards 0
                this.mesh.rotation.x += (0 - this.mesh.rotation.x) * smoothFactor;
                
                // Prevent micro-oscillations near 0
                if (Math.abs(this.mesh.rotation.x) < 0.01) {
                    this.mesh.rotation.x = 0;
                }
            }
            
            if (this.rollLeft) {
                // Roll left
                this.mesh.rotation.z += 0.5 * delta;
            } else if (this.rollRight) {
                // Roll right
                this.mesh.rotation.z -= 0.5 * delta;
            } else {
                // If no key is pressed, gradually return to horizontal
                const smoothFactor = 0.1; // Same smoothing factor as for pitch
                
                // Smooth interpolation towards 0
                this.mesh.rotation.z += (0 - this.mesh.rotation.z) * smoothFactor;
                
                // Prevent micro-oscillations near 0
                if (Math.abs(this.mesh.rotation.z) < 0.01) {
                    this.mesh.rotation.z = 0;
                }
            }
            
            // Gestion du lacet avec protection contre les rotations extrêmes
            if (this.yawLeft) {
                const newYaw = this.mesh.rotation.y + rotationSpeed * delta;
                // Normalize angle between -PI and PI
                this.mesh.rotation.y = Math.atan2(Math.sin(newYaw), Math.cos(newYaw));
            }
            if (this.yawRight) {
                const newYaw = this.mesh.rotation.y - rotationSpeed * delta;
                // Normalize angle between -PI and PI
                this.mesh.rotation.y = Math.atan2(Math.sin(newYaw), Math.cos(newYaw));
            }
            
            // Strict rotation limits to prevent impossible positions
            this.mesh.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.x));
            this.mesh.rotation.z = Math.max(-Math.PI/4, Math.min(Math.PI/4, this.mesh.rotation.z));
            
            // Additional check to prevent flipping
            const upVector = new THREE.Vector3(0, 1, 0);
            upVector.applyEuler(this.mesh.rotation);
            if (upVector.y < 0) {
                // Correct orientation if hang glider is flipped
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
            const liftVector = liftDirection.multiplyScalar(liftForce * delta * 3.0); // Multiplied by 3 for a stronger effect
            this.velocity.add(liftVector);
            
            // Ajout d'une force verticale directe basée sur l'angle de tangage
            // Cela garantit un effet immédiat sur l'altitude
            const pitchEffect = 200 * Math.sin(this.mesh.rotation.x); // Direct vertical force
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
            const maxSpeed = 200; // Vitesse maximum in km/h
            const currentSpeed = this.velocity.length() * 3.6; // Convert to km/h
            
            // Reduce propulsion if approaching maximum speed
            const speedRatio = currentSpeed / maxSpeed;
            const propulsionForce = 150 * Math.max(0, 1 - speedRatio);
            
            // Create a horizontal direction vector (ignoring Y component)
            const forwardDirection = new THREE.Vector3(0, 0, -1);
            forwardDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y);
            const horizontalDirection = new THREE.Vector3(forwardDirection.x, 0, forwardDirection.z).normalize();
            
            // Apply propulsion only horizontally
            const propulsionVector = horizontalDirection.multiplyScalar(propulsionForce * delta);
            this.velocity.add(propulsionVector);
            
            // Limit maximum speed
            if (currentSpeed > maxSpeed) {
                const reduction = maxSpeed / currentSpeed;
                this.velocity.multiplyScalar(reduction);
            }
            
            // Add progressive air resistance
            const airResistance = Math.pow(speedRatio, 2) * 0.02;
            this.velocity.multiplyScalar(1 - airResistance);
            
            // Don't stabilize altitude to allow natural climb/descend
            
            // Lateral inclination effect (turn)
            // The more inclined, the more turning
            const turnFactor = Math.sin(this.mesh.rotation.z) * 2.0;
            
            // Rotate velocity vector to simulate a turn
            // But only if not climbing/pitching
            if (Math.abs(turnFactor) > 0.01) {
                const turnAxis = new THREE.Vector3(0, 1, 0);
                const turnAngle = turnFactor * delta;
                this.velocity.applyAxisAngle(turnAxis, turnAngle);
                
                // Add a slight yaw (yaw) rotation for a more natural turn
                // Use quaternion for this rotation to avoid gimbal lock issues
                const yawCorrection = new THREE.Quaternion().setFromAxisAngle(this.YAW_AXIS, turnFactor * delta * 0.5);
                this.mesh.quaternion.multiply(yawCorrection);
                
                // Update Euler angles after correction
                this.mesh.rotation.setFromQuaternion(this.mesh.quaternion, 'YXZ');
            }
            
            // Position before update for collision detection
            const previousPosition = this.mesh.position.clone();
            
            // Apply velocity to position
            this.mesh.position.x += this.velocity.x * delta;
            this.mesh.position.y += this.velocity.y * delta;
            this.mesh.position.z += this.velocity.z * delta;
            
            // Check minimum altitude
            if (this.mesh.position.y < this.minAltitude) {
                this.mesh.position.y = this.minAltitude;
                
                // If descending too low, cancel negative vertical velocity
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    
                    // Add a slight upward push to prevent sticking to the ground
                    this.velocity.y += 5;
                }
            }
            
            // Check maximum altitude
            if (this.mesh.position.y > this.maxAltitude) {
                this.mesh.position.y = this.maxAltitude;
                
                // If climbing too high, cancel positive vertical velocity
                if (this.velocity.y > 0) {
                    this.velocity.y = 0;
                    
                    // Add a slight downward push to prevent sticking to the ceiling
                    this.velocity.y -= 5;
                }
            }
            
            // Collision detection with terrain
            this.checkTerrainCollision(previousPosition, delta);
            
            // Suppression de la friction pour maintenir une vitesse constante
            // this.velocity.x *= 0.999;
            // this.velocity.z *= 0.999;
            
            // Create or update flight information panel (always visible)
            let infoDiv = document.getElementById('flight-info');
            if (!infoDiv) {
                infoDiv = document.createElement('div');
                infoDiv.id = 'flight-info';
                infoDiv.style.position = 'absolute';
                infoDiv.style.bottom = '250px'; // Positioned above controls
                infoDiv.style.left = '20px'; // Positioned to the left
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
                infoDiv.style.maxHeight = '60vh'; // Maximum reduced height
                infoDiv.style.overflowY = 'auto';
                document.body.appendChild(infoDiv);
            }
            
            // Formatage des informations de vol
            const speedKmh = Math.round(airSpeed * 3.6); // m/s in km/h
            const altitude = Math.round(this.mesh.position.y);
            const terrainHeight = this.terrain ? Math.round(this.getTerrainHeightAtPosition(this.mesh.position.x, this.mesh.position.z)) : 0;
            const heightAboveTerrain = Math.round(altitude - terrainHeight);
            const windInfo = this.windEnabled ? 
                `${Math.round(this.windSpeed * 3.6)} km/h (${this.getWindDirectionName()})` : 
                'disabled';
            const thermalInfo = this.thermalStrength > 0 ? 
                `+${Math.round(this.thermalStrength * 3.6)} km/h` : 
                'None';
            const angleOfAttackDeg = Math.round(angleOfAttack * 180 / Math.PI);
            const inclinaisonDeg = Math.round(this.mesh.rotation.z * 180 / Math.PI);
            
            // Vérifier si les valeurs sont valides (non NaN)
            const validAltitude = isNaN(altitude) ? 0 : altitude;
            const validHeightAboveTerrain = isNaN(heightAboveTerrain) ? 0 : heightAboveTerrain;
            const validSpeedKmh = isNaN(speedKmh) ? 0 : speedKmh;
            const validAngleOfAttackDeg = isNaN(angleOfAttackDeg) ? 0 : angleOfAttackDeg;
            const validInclinaisonDeg = isNaN(inclinaisonDeg) ? 0 : inclinaisonDeg;
            
            // Style for labels and values - more compact format
            const labelStyle = 'color: #8adbff; display: inline-block; width: 100px; font-size: 13px;';
            const valueStyle = 'color: #ffffff; font-weight: bold; font-size: 13px;';
            const sectionStyle = 'margin-bottom: 5px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 5px;';
            
            // Compact HTML content with styling
            infoDiv.innerHTML = `
                <div style="text-align: center; font-size: 14px; margin-bottom: 8px; color: #ffcc00;">INFORMATION</div>
                <div style="${sectionStyle}">
                    <div><span style="${labelStyle}">FPS:</span> <span style="${valueStyle}">${this.currentFPS}</span></div>
                    <div><span style="${labelStyle}">Online:</span> <span style="${valueStyle}">${this.playerCount}</span></div>
                    <div><span style="${labelStyle}">Controls:</span> <span style="${valueStyle}">← →</span></div>
                </div>
            `;
            
            // Change background color on collision
            if (this.isColliding) {
                infoDiv.style.backgroundColor = 'rgba(200, 0, 0, 0.8)';
            } else {
                infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }

            // Add sail collision check
            this.checkVoileCollision();
        } catch (error) {
            console.error('Error updating hang glider:', error);
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
        
        // Position de base derrière le deltaplane - plus éloignée et plus haute
        const offset = new THREE.Vector3(0, 8, 35); // Augmenté la distance et la hauteur pour une meilleure vue
        
        // Calculer la rotation du deltaplane en excluant le pitch (rotation X)
        // Cela permet de garder une vue stable même lors des montées/descentes
        const smoothedRotationY = this.mesh.rotation.y;
        const rotatedOffset = new THREE.Vector3(
            offset.x * Math.cos(smoothedRotationY) + offset.z * Math.sin(smoothedRotationY),
            offset.y,
            -offset.x * Math.sin(smoothedRotationY) + offset.z * Math.cos(smoothedRotationY)
        );
        
        // Position cible de la caméra
        const targetPosition = this.mesh.position.clone().add(rotatedOffset);
        
        // Si c'est la première fois, initialiser la position de la caméra
        if (!this.lastCameraPosition) {
            this.lastCameraPosition = targetPosition.clone();
            mainCamera.position.copy(targetPosition);
        }
        
        // Smoothing factors
        const distanceToTarget = mainCamera.position.distanceTo(targetPosition);
        const baseSmooth = 0.1; // Base smoothing
        const speedFactor = this.velocity.length() / 300; // Factor based on speed
        const smoothFactor = Math.min(baseSmooth + speedFactor * 0.1, 0.3);
        
        // Interpolate position with smoothing
        mainCamera.position.lerp(targetPosition, smoothFactor);
        
        // Point towards which the camera looks (slightly in front of the hang glider)
        const lookAheadDistance = 20 * (this.velocity.length() / 300); // Look ahead distance, proportional to speed
        const lookAtTarget = this.mesh.position.clone().add(
            direction.multiplyScalar(lookAheadDistance)
        );
        
        // Initialize look-at point if necessary
        if (!this.currentLookAt) {
            this.currentLookAt = lookAtTarget.clone();
        }
        
        // Interpolate look-at point with the same smoothing
        this.currentLookAt.lerp(lookAtTarget, smoothFactor);
        
        // The camera looks at the interpolated point
        mainCamera.lookAt(this.currentLookAt);
        
        // Save last position for next frame
        this.lastCameraPosition = mainCamera.position.clone();
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
        return 'No wind';
    }
    
    /**
     * Change la direction et la vitesse du vent - désactivé
     * @param {THREE.Vector3} direction - Direction du vent
     * @param {number} speed - Vitesse du vent in m/s
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
        const isOnGround = this.mesh.position.y <= terrainHeight + 0.5; // 0.5 meter above ground is considered "on ground"
        
        if (isOnGround) {
            // On est en collision avec le terrain ou au sol
            this.isColliding = true;
            
            // Calculer la vitesse d'impact
            const impactSpeed = this.velocity.length();
            const verticalSpeed = Math.abs(this.velocity.y);
            
            // Si on est en train de rouler (vitesse verticale faible)
            const isRolling = verticalSpeed < 3.0; // Less than 3 m/s in vertical speed
            
            if (isRolling) {
                // Mode roulement sur le sol
                this.mesh.position.y = terrainHeight + 0.1; // Keep slightly above ground
                
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
                // Collision with impact
                
                // Calculer les dommages en fonction de la vitesse d'impact
                // Plus on va vite, plus les dommages sont importants
                const damageMultiplier = 0.5; // Adjust based on desired difficulty
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
                    const energyLoss = 0.5; // 50% energy loss
                    this.velocity.copy(reflection.multiplyScalar(energyLoss));
                    
                    // Additional speed reduction
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
    
    /**
     * Met à jour le nombre de joueurs
     * @param {number} count - Le nombre de joueurs en ligne
     */
    updatePlayerCount(count) {
        this.playerCount = count;
    }

    /**
     * Removes the deltaplane from the scene and cleans up resources
     */
    dispose() {
        if (this.mesh) {
            // Remove all children (including nameTag)
            while (this.mesh.children.length > 0) {
                const child = this.mesh.children[0];
                this.mesh.remove(child);
                if (child.material) {
                    child.material.dispose();
                }
                if (child.geometry) {
                    child.geometry.dispose();
                }
            }
            
            // Remove from scene
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        
        // Clean up other resources
        this.voile = null;
        this.scene = null;
    }
} 