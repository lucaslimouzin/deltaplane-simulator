import * as THREE from 'three';
import { Minimap } from './minimap.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { INITIAL_ALTITUDE } from './index.js';

// Variables globales
let minimap;

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
        this.lightspeedParticles = null; // Pour stocker le système de particules
        
        // Ces propriétés ne sont nécessaires que pour le joueur local
        if (!isRemotePlayer) {
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.camera = null;
            this.currentLookAt = null;
            
            // Créer la minimap seulement pour le joueur local
            if (!minimap) {
                minimap = new Minimap(scene, null, null);
            }
            
            // Controls (only for sail orientation)
            this.pitchUp = false;    // Pitch up (raise nose)
            this.pitchDown = false;  // Pitch down (lower nose)
            this.rollLeft = false;   // Roll left
            this.rollRight = false;  // Roll right
            this.yawLeft = false;    // Turn left
            this.yawRight = false;   // Turn right
            this.sprinting = false;  // Nouvel état pour le sprint
            this.descendDown = false; // Nouvelle propriété pour la descente
            this.ascendUp = false;   // Nouvelle propriété pour la montée
            
            // Flight parameters
            this.airDensity = 1.2; // kg/m³
            this.wingArea = 15; // m²
            this.liftCoefficient = 2.0;
            this.dragCoefficient = 0.001;
            this.weight = 100; // kg (pilot + hang glider)
            this.lastYaw = 0; // To track yaw rotation
            this.minAltitude = 50; // Minimum altitude in meters
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
            
            // Sprint parameters
            this.sprintEnergy = 100;  // Énergie maximale du sprint
            this.currentSprintEnergy = 100;  // Énergie actuelle
            this.sprintSpeed = 2.0;  // Multiplicateur de vitesse pendant le sprint
            this.sprintDrain = 30;  // Vitesse de consommation de l'énergie (unités par seconde)
            this.sprintRecharge = 15;  // Vitesse de recharge de l'énergie (unités par seconde)
            this.minEnergyToSprint = 20;  // Énergie minimale requise pour sprinter

            // Control states
            this.controls = {
                rollLeft: false,
                rollRight: false,
                descendDown: false,
                ascendUp: false
            };

            // Liste des couleurs possibles pour la voile
            this.availableColors = [
                0xFF0000, // Rouge
                0x00FF00, // Vert
                0x0000FF, // Bleu
                0xFFFF00, // Jaune
                0xFF00FF, // Magenta
                0x00FFFF, // Cyan
                0xFF8000, // Orange
                0x8000FF, // Violet
                0x0080FF, // Bleu clair
                0xFF0080  // Rose
            ];

            // Liste des couleurs pour le personnage
            this.pilotColors = [
                0x2244aa, // Bleu original
                0x22aa44, // Vert forêt
                0xaa2244, // Rouge foncé
                0x8822aa, // Violet foncé
                0xaa8822, // Or foncé
                0x227788, // Bleu canard
                0x884422, // Marron
                0x442288, // Indigo
                0x228844, // Vert émeraude
                0x882244  // Bordeaux
            ];

            // Appliquer les paramètres d'URL si disponibles
            this.applyUrlParameters();
        }
        
        // Create the hang glider model
        this.createModel();
        
        // Create random thermals only for local player
        if (!isRemotePlayer) {
            this.createThermals();
        }

        // Création de la boîte de collision pour le deltaplane
        const collisionGeometry = new THREE.BoxGeometry(20, 10, 20);
        this.collisionBox = new THREE.Box3();

        // Ajouter une propriété pour le portail de retour
        this.returnPortal = null;
        
        // Vérifier si on arrive d'un autre jeu
        if (!isRemotePlayer) {
            this.createStartPortalIfNeeded();
        }
    }
    
    /**
     * Applique les paramètres d'URL au deltaplane
     */
    applyUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Appliquer la vitesse si spécifiée
        const speed = parseFloat(urlParams.get('speed'));
        if (!isNaN(speed)) {
            // Convertir la vitesse en vecteur de vélocité
            const direction = new THREE.Vector3(0, 0, -1);
            this.velocity.copy(direction.multiplyScalar(speed));
        }

        // Appliquer la couleur si spécifiée
        const color = urlParams.get('color');
        if (color) {
            // Attendre que le mesh soit créé
            const applyColor = () => {
                if (this.voile) {
                    let colorValue;
                    if (color.startsWith('#')) {
                        colorValue = color;
                    } else {
                        // Convertir les noms de couleur en valeurs hexadécimales
                        const colorMap = {
                            'red': '#FF0000',
                            'green': '#00FF00',
                            'blue': '#0000FF',
                            'yellow': '#FFFF00',
                            // Ajouter d'autres couleurs si nécessaire
                        };
                        colorValue = colorMap[color.toLowerCase()] || '#FFFFFF';
                    }
                    this.voile.material.color.set(colorValue);
                } else {
                    // Si le mesh n'est pas encore créé, réessayer dans 100ms
                    setTimeout(applyColor, 100);
                }
            };
            applyColor();
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
            this.mesh.position.y = INITIAL_ALTITUDE;
            
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
            
            // Sélection aléatoire d'une couleur pour la voile
            const randomColor = this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
            
            const voileMaterial = new THREE.MeshStandardMaterial({ 
                color: randomColor, 
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
            
            // Sélection aléatoire d'une couleur pour le pilote
            const randomPilotColor = this.pilotColors[Math.floor(Math.random() * this.pilotColors.length)];

            // Corps du pilote - plus vertical
            const corpsGeometry = new THREE.CylinderGeometry(1.2, 1.2, 6, 4);
            const corpsMaterial = new THREE.MeshStandardMaterial({
                color: randomPilotColor,
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
                color: randomPilotColor, // Utiliser la même couleur que le corps
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
            this.mesh.rotation.x = Math.PI / 24;
            
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

            // Création de la jauge de sprint avec un sprite
            const sprintBarHeight = 128;
            const sprintBarWidth = 32;

            // Créer une texture pour la jauge
            const canvas = document.createElement('canvas');
            canvas.width = sprintBarWidth;
            canvas.height = sprintBarHeight;
            this.sprintBarContext = canvas.getContext('2d');
            const sprintBarTexture = new THREE.CanvasTexture(canvas);
            sprintBarTexture.minFilter = THREE.LinearFilter;

            // Créer le sprite
            const spriteMaterial = new THREE.SpriteMaterial({
                map: sprintBarTexture,
                transparent: true
            });
            this.sprintBarSprite = new THREE.Sprite(spriteMaterial);
            this.sprintBarSprite.scale.set(0.4, 4, 1);
            
            // Positionner le sprite à droite du pilote
            this.sprintBarSprite.position.set(2, -4, 0);
            this.piloteGroup.add(this.sprintBarSprite);

            // Fonction pour mettre à jour la texture de la jauge
            this.updateSprintBarTexture = (ratio, isSprinting) => {
                const ctx = this.sprintBarContext;
                
                // Sauvegarder le contexte
                ctx.save();
                
                // Effacer le canvas
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                
                // Rotation du contexte
                ctx.translate(ctx.canvas.width/2, ctx.canvas.height/2);
                ctx.rotate(Math.PI/2);
                ctx.translate(-ctx.canvas.height/2, -ctx.canvas.width/2);
                
                // Dessiner le fond
                ctx.fillStyle = 'rgba(51, 51, 51, 0.5)';
                ctx.fillRect(0, 0, ctx.canvas.height, ctx.canvas.width);

                // Dessiner la barre d'énergie
                const width = ctx.canvas.height * ratio;
                ctx.fillStyle = isSprinting ? '#ff3333' : '#33ff33';
                // Dessiner à partir de la droite pour que ça se vide de haut en bas après rotation
                ctx.fillRect(ctx.canvas.height - width, 0, width, ctx.canvas.width);

                // Restaurer le contexte
                ctx.restore();

                // Mettre à jour la texture
                this.sprintBarSprite.material.map.needsUpdate = true;
            };

        } catch (error) {
            console.error('Erreur lors de la création du deltaplane:', error);
        }
    }
    
    
    /**
     * Réinitialise la position et la vitesse du deltaplane
     */
    resetPosition() {
        this.mesh.position.set(0, INITIAL_ALTITUDE, 0);
        
        // Réinitialiser la rotation avec des quaternions
        this.mesh.rotation.set(Math.PI / 24, 0, 0);
        this.mesh.quaternion.setFromEuler(this.mesh.rotation);
        
        this.velocity.set(0, 0, 0);
        this.collisionDamage = 0; // Réinitialiser les dommages
    }
    
    /**
     * Updates the hang glider's position and rotation
     * @param {number} delta - Time elapsed since last update
     */
    update(delta, thermalPositions = null) {
        if (this.isRemotePlayer) return;
        
        try {
            // Calcul des FPS
            const currentTime = performance.now();
            const timeDiff = currentTime - this.lastTime;
            this.currentFPS = Math.round(1000 / timeDiff);
            this.lastTime = currentTime;

            // Update sprint energy
            if (this.sprinting && this.currentSprintEnergy > 0) {
                // Drain energy while sprinting
                this.currentSprintEnergy = Math.max(0, this.currentSprintEnergy - this.sprintDrain * delta);
                
                // Disable sprint if energy is too low
                if (this.currentSprintEnergy < 1) {
                    this.sprinting = false;
                }
            } else if (!this.sprinting && this.currentSprintEnergy < this.sprintEnergy) {
                // Recharge energy when not sprinting
                this.currentSprintEnergy = Math.min(
                    this.sprintEnergy,
                    this.currentSprintEnergy + this.sprintRecharge * delta
                );
            }

            // Store previous position for collision detection
            const previousPosition = this.mesh.position.clone();
            
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
            
            if (this.controls.rollLeft) {
                // Roll left
                this.mesh.rotation.z += 0.5 * delta;
            } else if (this.controls.rollRight) {
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
            
            // Application de la descente
            if (this.controls.descendDown) {
                this.velocity.y -= 200 * delta;
            }

            // Apply ascent if ascendUp is active
            if (this.controls.ascendUp) {
                this.velocity.y += 200 * delta;
            }

            // Calcul de la direction du deltaplane basée sur son orientation
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.mesh.quaternion);
            
            // Calcul de la vitesse relative à l'air (sans tenir compte du vent)
            const airVelocity = this.velocity.clone();
            
            // Vecteur de vent et effet du vent - désactivés
            let windVector = new THREE.Vector3(0, 0, 0);
            let windAngleEffect = 0;
            let windLiftEffect = 0;
            
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
            
            // Application de la portance
            const liftVector = liftDirection.multiplyScalar(liftForce * delta * 3.0);
            this.velocity.add(liftVector);
            
            // Ajout d'une force verticale directe basée sur l'angle de tangage
            const pitchEffect = 200 * Math.sin(this.mesh.rotation.x);
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

            // Apply sprint multiplier if active
            const speedMultiplier = this.sprinting ? this.sprintSpeed : 1.0;
            this.velocity.multiplyScalar(speedMultiplier);
            
            // Limit maximum speed
            if (currentSpeed > maxSpeed) {
                const reduction = maxSpeed / currentSpeed;
                this.velocity.multiplyScalar(reduction);
            }
            
            // Add progressive air resistance
            const airResistance = Math.pow(speedRatio, 2) * 0.02;
            this.velocity.multiplyScalar(1 - airResistance);
            
            // Lateral inclination effect (turn)
            const turnFactor = Math.sin(this.mesh.rotation.z) * 2.0;
            
            // Rotate velocity vector to simulate a turn
            if (Math.abs(turnFactor) > 0.01) {
                const turnAxis = new THREE.Vector3(0, 1, 0);
                const turnAngle = turnFactor * delta;
                this.velocity.applyAxisAngle(turnAxis, turnAngle);
                
                // Add a slight yaw rotation for a more natural turn
                const yawCorrection = new THREE.Quaternion().setFromAxisAngle(this.YAW_AXIS, turnFactor * delta * 0.5);
                this.mesh.quaternion.multiply(yawCorrection);
                
                // Update Euler angles after correction
                this.mesh.rotation.setFromQuaternion(this.mesh.quaternion, 'YXZ');
            }
            
            // Update position
            this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
            
            // Check minimum altitude
            if (this.mesh.position.y < this.minAltitude) {
                this.mesh.position.y = this.minAltitude;
                
                // If descending too low, cancel negative vertical velocity
                if (this.velocity.y < 0) {
                    this.velocity.y = 0;
                    this.velocity.y += 5;
                }
            }
            
            // Check maximum altitude
            if (this.mesh.position.y > this.maxAltitude) {
                this.mesh.position.y = this.maxAltitude;
                
                // If climbing too high, cancel positive vertical velocity
                if (this.velocity.y > 0) {
                    this.velocity.y = 0;
                    this.velocity.y -= 5;
                }
            }
            
            // Collision detection with terrain
            this.checkTerrainCollision(previousPosition, delta);
            
            // Update info panel
            const containerStyle = `
                font-family: 'system-ui', sans-serif;
                position: fixed;
                bottom: -1px;
                left: -1px;
                padding: 5px;
                font-size: 12px;
                font-weight: 500;
                background: #fff;
                color: #000;
                text-decoration: none;
                z-index: 10000;
                border-top-right-radius: 8px;
                border: 1px solid #fff;
            `;

            // Create or update info div
            let infoDiv = document.getElementById('info-panel');
            if (!infoDiv) {
                infoDiv = document.createElement('div');
                infoDiv.id = 'info-panel';
                document.body.appendChild(infoDiv);
            }

            infoDiv.style.cssText = containerStyle;

            // Compact HTML content with styling and sprint gauge
            infoDiv.innerHTML = `
                <div style="${containerStyle}">
                    <div>Online: ${this.playerCount}</div>
                    <div>Controls: ← →</div>
                </div>
            `;

            // Add sail collision check
            this.checkVoileCollision();
            
            // Update minimap
            if (minimap && this.mesh) {
                minimap.updatePlayerPosition(
                    this.mesh.position,
                    { y: this.mesh.rotation.y }
                );
                minimap.update();
            }

            // Mettre à jour la jauge de sprint
            if (this.sprintBarSprite && this.updateSprintBarTexture) {
                const energyRatio = this.currentSprintEnergy / this.sprintEnergy;
                this.updateSprintBarTexture(energyRatio, this.sprinting);
                
                // Faire toujours face à la caméra (propriété des sprites)
                this.sprintBarSprite.position.set(2, -4, 0);

                // Appliquer la rotation du deltaplane à la jauge (sens inversé)
                this.sprintBarSprite.material.rotation = this.mesh.rotation.z;
            }

            // Mise à jour de la boîte de collision
            this.collisionBox.setFromObject(this.mesh);

            // Vérification des collisions avec les portails
            this.checkPortalCollisions();
        } catch (error) {
            console.error('Error in deltaplane update:', error);
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
        if (control in this.controls) {
            this.controls[control] = state;
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

    toggleSprint(activate) {
        if (activate && this.currentSprintEnergy >= this.minEnergyToSprint) {
            this.sprinting = true;
        } else {
            this.sprinting = false;
        }
    }

    createStartPortalIfNeeded() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromPortal = urlParams.get('portal') === 'true';
        const refUrl = urlParams.get('ref');

        if (fromPortal && refUrl) {
            // Créer un portail de retour près du point de spawn
            const portalGeometry = new THREE.TorusGeometry(10, 1, 16, 100);
            const portalMaterial = new THREE.MeshStandardMaterial({
                color: 0x4444ff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x0000ff,
                emissiveIntensity: 0.5
            });

            this.returnPortal = new THREE.Mesh(portalGeometry, portalMaterial);
            this.returnPortal.position.set(
                this.mesh.position.x + 20,  // Légèrement à droite du point de spawn
                this.mesh.position.y,       // Même hauteur
                this.mesh.position.z + 20   // Légèrement devant
            );
            
            // Stocker l'URL de retour et les paramètres dans les données du portail
            this.returnPortal.userData = {
                isReturnPortal: true,
                returnUrl: refUrl,
                originalParams: Object.fromEntries(urlParams)
            };

            this.scene.add(this.returnPortal);
            
            // Ajouter le portail de retour à la liste des portails
            if (!window.balloons) window.balloons = [];
            window.balloons.push(this.returnPortal);
        }
    }

    checkPortalCollisions() {
        if (!window.balloons) return;

        // Si un timer est en cours, on ne vérifie pas les collisions
        if (this.portalCollisionTimer) return;

        for (const portal of window.balloons) {
            const distance = Math.sqrt(
                Math.pow(portal.position.x - this.mesh.position.x, 2) +
                Math.pow(portal.position.z - this.mesh.position.z, 2)
            );

            if (distance < 35) {
                // Activer le timer pour éviter les collisions multiples
                this.portalCollisionTimer = setTimeout(() => {
                    this.portalCollisionTimer = null;
                }, 2000);

                if (portal.userData.isGoldenPortal) {
                    // Calculer la vitesse actuelle en mètres par seconde
                    const currentSpeed = Math.sqrt(
                        Math.pow(this.velocity.x, 2) +
                        Math.pow(this.velocity.y, 2) +
                        Math.pow(this.velocity.z, 2)
                    );

                    // Récupérer le nom du joueur depuis le système multiplayer
                    const username = window.multiplayerManager ? window.multiplayerManager.playerName : 'player';

                    // Construire l'URL avec les paramètres
                    const params = new URLSearchParams({
                        username: username,
                        color: 'yellow',
                        speed: currentSpeed.toFixed(2),
                        portal: 'true',
                        ref: window.location.href
                    });

                    // Redirection instantanée
                    window.location.href = `http://portal.pieter.com/?${params.toString()}`;
                } else if (portal.userData.isReturnPortal) {
                    // Récupérer l'URL de retour et les paramètres originaux
                    const returnUrl = portal.userData.returnUrl;
                    const originalParams = portal.userData.originalParams;
                    
                    // Construire les paramètres de retour
                    const params = new URLSearchParams(originalParams);
                    params.set('portal', 'true');  // Indiquer qu'on vient d'un portail
                    
                    // Redirection vers l'URL de retour avec les paramètres
                    window.location.href = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}${params.toString()}`;
                } else if (portal.userData.portalData && portal.userData.portalData.url) {
                    // Ajouter les paramètres nécessaires pour les portails normaux
                    const url = new URL(portal.userData.portalData.url);
                    url.searchParams.set('portal', 'true');
                    url.searchParams.set('ref', window.location.href);
                    
                    window.open(url.toString(), '_blank');
                }
            }
        }
    }
} 