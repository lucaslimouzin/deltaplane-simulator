import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import seedrandom from 'seedrandom';

// Configuration du terrain
const config = {
    // Paramètres généraux
    terrainSize: 2000,         // Taille totale du terrain (augmentée pour accueillir plusieurs îles)
    waterSize: 3000,           // Taille du plan d'eau (augmentée également)
    waterLevel: -0.5,          // Niveau de l'eau légèrement abaissé pour éviter le z-fighting
    
    // Paramètres de forme des îles
    islandShapeComplexity: 0.7,    // Complexité de la forme des îles (0-1)
    islandEdgeRoughness: 0.4,      // Rugosité des bords des îles (0-1)
    
    // Paramètres des îles
    islands: [
        {
            center: { x: 0, z: 0 },
            radius: 400,
            mountainHeight: 300,
            biome: 'temperate',
            hasMountain: true,
            mountains: [
                { x: -100, z: -100, height: 300 },
                { x: 100, z: 100, height: 250 },
                { x: -50, z: 150, height: 200 }
            ]
        },
        {
            center: { x: -700, z: 500 },
            radius: 250,
            mountainHeight: 100,
            biome: 'tropical',
            hasMountain: false
        },
        {
            center: { x: 600, z: -400 },
            radius: 300,
            mountainHeight: 200,
            biome: 'desert',
            hasMountain: true
        },
        {
            center: { x: 800, z: 700 },
            radius: 180,
            mountainHeight: 80,
            biome: 'volcanic',
            hasMountain: true
        },
        {
            center: { x: -400, z: -600 },
            radius: 350,
            mountainHeight: 350,
            biome: 'snowy',
            hasMountain: true,
            mountains: [
                { x: -450, z: -650, height: 350 },
                { x: -350, z: -550, height: 300 },
                { x: -500, z: -500, height: 280 }
            ]
        }
    ],
    
    // Paramètres de terrain
    terrainSegments: 120,      // Nombre de segments pour le terrain (augmenté pour plus de détail)
    
    // Paramètres des arbres
    numTreesPerIsland: 80,     // Nombre d'arbres par île
    treeMinHeight: 8,          // Hauteur minimale des arbres
    treeMaxHeight: 20,         // Hauteur maximale des arbres
    
    // Paramètres des habitations
    numHousesPerIsland: 15,
    houseMinSize: 5,
    houseMaxSize: 10,
    
    // Couleurs des biomes
    biomes: {
        temperate: {
            beach: 0xFFE66D,       // Sable
            grass: 0x7BC950,       // Vert clair
            forest: 0x2D936C,      // Vert foncé
            mountain: 0x9B7653,    // Marron
            snow: 0xFFFAFA,        // Blanc
            treeColor: 0x2D936C    // Vert pour les feuilles
        },
        tropical: {
            beach: 0xFFF2CC,       // Sable clair
            grass: 0x9DE649,       // Vert vif
            forest: 0x45B69C,      // Turquoise
            mountain: 0xB3A369,    // Beige
            snow: 0xFFFFFF,        // Blanc
            treeColor: 0x45B69C    // Turquoise pour les feuilles
        },
        desert: {
            beach: 0xF6D7B0,       // Sable doré
            grass: 0xD4AC6E,       // Beige
            forest: 0x7D6608,      // Vert olive
            mountain: 0xAA6C39,    // Brun
            snow: 0xF0E68C,        // Jaune pâle
            treeColor: 0x7D6608    // Vert olive pour les feuilles
        },
        volcanic: {
            beach: 0x696969,       // Gris foncé
            grass: 0x8B4513,       // Brun
            forest: 0x556B2F,      // Vert olive foncé
            mountain: 0x3D3635,    // Gris très foncé
            snow: 0xFF4500,        // Rouge orangé (lave)
            treeColor: 0x556B2F    // Vert olive foncé pour les feuilles
        },
        snowy: {
            beach: 0xE6E6FA,
            grass: 0xF0F8FF,
            forest: 0xF5F5F5,
            mountain: 0xDCDCDC,
            snow: 0xFFFFFF,
            treeColor: 0x90EE90
        }
    },
    
    // Couleurs générales
    colors: {
        water: 0x4ECDC4,       // Turquoise
        trunkColor: 0x8B4513,  // Marron pour les troncs
    },
    
    // Paramètres visuels
    enableShadows: true,
    fogColor: 0x87CEEB,        // Couleur du ciel/brouillard
    fogNear: 1500,             // Distance de début du brouillard (augmentée)
    fogFar: 4000,             // Distance de fin du brouillard (augmentée)
    
    // Paramètres du système infini
    chunkSize: 1000,           // Taille d'un chunk
    renderDistance: 3,         // Distance de rendu en chunks
    islandDensity: 0.3,       // Probabilité d'avoir une île dans un chunk
    minIslandSpacing: 800,    // Distance minimale entre les îles
};

// Variables globales
let scene, camera, renderer;
let terrain, water;
let noise = new SimplexNoise();
let loadedChunks = new Map(); // Stockage des chunks chargés
let currentChunk = { x: 0, z: 0 }; // Position actuelle du joueur en chunks

/**
 * Initialise la scène Three.js
 */
export function initScene(container) {
    // Créer la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.fogColor);
    scene.fog = new THREE.Fog(config.fogColor, config.fogNear, config.fogFar);
    
    // Créer la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, config.fogFar);
    camera.position.set(0, 300, 600); // Position plus élevée pour voir toutes les îles
    camera.lookAt(0, 0, 0);
    
    // Créer le renderer avec des paramètres améliorés
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true // Ajout pour améliorer la précision du depth buffer
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = config.enableShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setClearColor(config.fogColor);
    
    // Ajouter le renderer au conteneur
    if (container) {
        container.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }
    
    // Ajouter les lumières
    addLights();
    
    // Créer les îles
    createIslands();
    
    // Créer l'eau
    createWater();
    
    // Ajouter des arbres sur chaque île
    addTrees();
    
    // Ajouter des habitations
    addHouses();
    
    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', onWindowResize);
    
    // Initialiser le système de chunks
    updateChunks(0, 0);
    
    // Ajouter un écouteur pour mettre à jour les chunks quand la caméra bouge
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener('change', () => {
        const pos = camera.position;
        const newChunkX = Math.floor(pos.x / config.chunkSize);
        const newChunkZ = Math.floor(pos.z / config.chunkSize);
        
        if (newChunkX !== currentChunk.x || newChunkZ !== currentChunk.z) {
            currentChunk = { x: newChunkX, z: newChunkZ };
            updateChunks(newChunkX, newChunkZ);
        }
    });
    
    // Démarrer la boucle d'animation
    animate();
    
    return { scene, camera, renderer };
}

/**
 * Ajoute les lumières à la scène
 */
function addLights() {
    // Lumière ambiante
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Lumière directionnelle (soleil)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(500, 500, 0);
    directionalLight.castShadow = config.enableShadows;
    
    // Configuration des ombres améliorée
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 3000;
    directionalLight.shadow.camera.left = -1500;
    directionalLight.shadow.camera.right = 1500;
    directionalLight.shadow.camera.top = 1500;
    directionalLight.shadow.camera.bottom = -1500;
    directionalLight.shadow.bias = -0.0005; // Ajout pour réduire les artefacts d'ombre
    
    scene.add(directionalLight);
}

/**
 * Crée les îles avec différents biomes
 */
function createIslands() {
    // Créer la géométrie du terrain
    const geometry = new THREE.PlaneGeometry(
        config.terrainSize,
        config.terrainSize,
        config.terrainSegments,
        config.terrainSegments
    );
    
    // Rotation pour avoir un plan horizontal
    geometry.rotateX(-Math.PI / 2);
    
    // Obtenir les positions des vertices
    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);
    
    // Créer un tableau pour stocker les hauteurs (pour la fonction getTerrainHeightAtPosition)
    window.terrainHeights = [];
    
    // Modifier les hauteurs pour créer plusieurs îles
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Initialiser la hauteur à 0 (sous l'eau)
        let height = -5;
        let islandIndex = -1;
        let minDistance = Infinity;
        
        // Déterminer à quelle île appartient ce point (la plus proche)
        for (let j = 0; j < config.islands.length; j++) {
            const island = config.islands[j];
            
            // Calculer la distance de base au centre de l'île
            const baseDistance = Math.sqrt(
                Math.pow(x - island.center.x, 2) + 
                Math.pow(z - island.center.z, 2)
            );
            
            // Appliquer une déformation à la distance pour créer des formes non circulaires
            let distanceToIsland = baseDistance;
            
            // Utiliser le bruit de Perlin pour déformer le contour de l'île
            const angle = Math.atan2(z - island.center.z, x - island.center.x);
            const noiseScale = 2.0; // Échelle du bruit
            
            // Seed spécifique à chaque île pour des formes différentes
            const seed = j * 1000;
            
            // Déformation basée sur l'angle (crée des baies et des péninsules)
            const angleNoise = (noise.noise(Math.cos(angle) * noiseScale + seed, Math.sin(angle) * noiseScale + seed) + 1) * 0.5;
            
            // Déformation basée sur la position (crée des irrégularités locales)
            const posNoise = (noise.noise((x * 0.01) + seed, (z * 0.01) + seed) + 1) * 0.5;
            
            // Combiner les déformations
            const deformation = island.radius * config.islandShapeComplexity * (angleNoise * 0.7 + posNoise * 0.3);
            
            // Ajouter des variations de bord plus petites pour la rugosité
            const edgeNoise = (noise.noise((x * 0.05) + seed, (z * 0.05) + seed) + 1) * 0.5;
            const edgeDeformation = island.radius * config.islandEdgeRoughness * edgeNoise * 0.2;
            
            // Appliquer les déformations à la distance
            distanceToIsland = baseDistance - deformation - edgeDeformation;
            
            // Vérifier si ce point est dans l'île déformée
            if (distanceToIsland < island.radius && distanceToIsland < minDistance) {
                minDistance = distanceToIsland;
                islandIndex = j;
            }
        }
        
        // Si le point appartient à une île
        if (islandIndex >= 0) {
            const island = config.islands[islandIndex];
            const distanceToCenter = minDistance;
            
            // Facteur d'atténuation vers les bords (plus progressif pour les formes irrégulières)
            const falloff = Math.pow(1 - distanceToCenter / island.radius, 1.5);
            
            // Bruit pour les variations de terrain spécifique à chaque île
            const seed = islandIndex * 1000;
            const baseNoiseScale = 0.005;
            const detailNoiseScale = 0.02;
            
            const baseNoise = (noise.noise(x * baseNoiseScale + seed, z * baseNoiseScale + seed) + 1) * 0.5;
            const detailNoise = (noise.noise(x * detailNoiseScale + seed, z * detailNoiseScale + seed) + 1) * 0.5;
            
            const combinedNoise = baseNoise * 0.7 + detailNoise * 0.3;
            
            // Hauteur de base de l'île (varie selon le biome)
            const baseHeight = island.biome === 'snowy' ? 20 : (island.biome === 'desert' ? 3 : 5);
            height = baseHeight + 15 * falloff;
            
            // Gérer plusieurs montagnes si elles sont définies
            if (island.mountains) {
                for (const mountain of island.mountains) {
                    const distanceToMountain = Math.sqrt(
                        Math.pow(x - (island.center.x + mountain.x), 2) + 
                        Math.pow(z - (island.center.z + mountain.z), 2)
                    );
                    
                    if (distanceToMountain < island.radius * 0.3) {
                        const mountainFactor = Math.pow(1 - distanceToMountain / (island.radius * 0.3), 2);
                        const mountainNoise = noise.noise(x * 0.01 + seed, z * 0.01 + seed) * 0.3 + 0.7;
                        height += mountain.height * mountainFactor * mountainNoise;
                    }
                }
            }
            
            // Ajouter des variations de terrain spécifiques au biome
            if (island.biome === 'desert') {
                // Dunes pour le désert
                height += (noise.noise(x * 0.03 + seed, z * 0.03 + seed) * 0.5 + 0.5) * 10 * falloff;
            } else if (island.biome === 'tropical') {
                // Terrain plus vallonné pour l'île tropicale
                height += combinedNoise * 12 * falloff;
            } else if (island.biome === 'volcanic') {
                // Terrain plus accidenté pour l'île volcanique
                height += (noise.noise(x * 0.04 + seed, z * 0.04 + seed) * 0.5) * 15 * falloff;
            } else {
                // Variations standard pour l'île tempérée
                height += combinedNoise * 10 * falloff;
            }
            
            // Cas spécial pour le biome neigeux
            if (island.biome === 'snowy') {
                // Ajouter plus de variations pour créer des congères
                height += (noise.noise(x * 0.05 + seed, z * 0.05 + seed) * 0.5) * 20 * falloff;
                // Garantir une couverture neigeuse minimale
                if (height > config.waterLevel + 5) {
                    height += 5;
                }
            }
            
            // Ajouter des variations supplémentaires pour les côtes
            // Cela crée des plages, des falaises et des zones côtières variées
            if (falloff < 0.3) {
                const coastalNoise = noise.noise(x * 0.1 + seed, z * 0.1 + seed);
                
                if (coastalNoise > 0.3) {
                    // Créer des falaises sur certaines côtes
                    height += (coastalNoise - 0.3) * 30 * falloff;
                } else if (coastalNoise < -0.3) {
                    // Créer des plages plus plates sur d'autres côtes
                    height -= Math.abs(coastalNoise + 0.3) * 5;
                }
            }
        }
        
        // Arrondir la hauteur pour un effet low poly, mais avec des paliers plus petits pour plus de réalisme
        height = Math.round(height / 4) * 4;
        
        // Appliquer la hauteur
        positions[i + 1] = height;
        
        // Stocker la hauteur pour la fonction getTerrainHeightAtPosition
        window.terrainHeights.push({ x, z, height });
        
        // Déterminer la couleur en fonction de la hauteur et du biome
        let color = new THREE.Color(0x4ECDC4); // Couleur par défaut (eau)
        
        // Trouver l'île la plus proche pour déterminer le biome
        let nearestIsland = null;
        let minIslandDistance = Infinity;
        
        for (const island of config.islands) {
            const distanceToIsland = Math.sqrt(
                Math.pow(x - island.center.x, 2) + 
                Math.pow(z - island.center.z, 2)
            );
            
            if (distanceToIsland < minIslandDistance) {
                minIslandDistance = distanceToIsland;
                nearestIsland = island;
            }
        }
        
        // Si on a trouvé une île proche, utiliser ses couleurs de biome
        if (nearestIsland && height > config.waterLevel) {
            const biomeColors = config.biomes[nearestIsland.biome];
            
            if (height <= config.waterLevel + 2) {
                color = new THREE.Color(biomeColors.beach);
            } else if (height < 30) {
                color = new THREE.Color(biomeColors.grass);
            } else if (height < 100) {
                color = new THREE.Color(biomeColors.forest);
            } else if (height < 200) {
                color = new THREE.Color(biomeColors.mountain);
            } else {
                color = new THREE.Color(biomeColors.snow);
            }
            
            // Cas spécial pour l'île volcanique: lave au sommet
            if (nearestIsland.biome === 'volcanic' && height > nearestIsland.mountainHeight * 0.8) {
                // Mélanger avec la couleur de la lave
                const lavaFactor = Math.min(1, (height - nearestIsland.mountainHeight * 0.8) / 50);
                color.lerp(new THREE.Color(0xFF4500), lavaFactor);
            }
        }
        
        // Ajouter une légère variation de couleur pour plus de réalisme
        const variation = (Math.random() - 0.5) * 0.05;
        color.r = Math.max(0, Math.min(1, color.r + variation));
        color.g = Math.max(0, Math.min(1, color.g + variation));
        color.b = Math.max(0, Math.min(1, color.b + variation));
        
        // Assigner la couleur
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    // Mettre à jour la géométrie
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    // Créer le matériau
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Créer le mesh
    terrain = new THREE.Mesh(geometry, material);
    terrain.receiveShadow = config.enableShadows;
    terrain.castShadow = config.enableShadows;
    
    // Ajouter à la scène
    scene.add(terrain);
}

/**
 * Crée le plan d'eau
 */
function createWater() {
    // Créer la géométrie de l'eau
    const geometry = new THREE.PlaneGeometry(
        config.waterSize,
        config.waterSize,
        1,
        1
    );
    
    // Rotation pour avoir un plan horizontal
    geometry.rotateX(-Math.PI / 2);
    
    // Positionner l'eau au niveau de l'eau
    geometry.translate(0, config.waterLevel, 0);
    
    // Créer le matériau avec des paramètres améliorés
    const material = new THREE.MeshStandardMaterial({
        color: config.colors.water,
        transparent: true,
        opacity: 0.8,
        flatShading: true,
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0x1A9EAA,
        emissiveIntensity: 0.2,
        depthWrite: false, // Désactiver l'écriture dans le depth buffer pour éviter les artefacts
        polygonOffset: true, // Activer le décalage de polygone
        polygonOffsetFactor: -1, // Facteur de décalage négatif pour éviter le z-fighting
        polygonOffsetUnits: -1
    });
    
    // Créer le mesh
    water = new THREE.Mesh(geometry, material);
    water.receiveShadow = false;
    water.renderOrder = 1; // Définir l'ordre de rendu pour s'assurer que l'eau est rendue après le terrain
    
    // Ajouter à la scène
    scene.add(water);
}

/**
 * Ajoute des arbres sur chaque île
 */
function addTrees() {
    // Créer des géométries partagées pour les arbres
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 1, 4, 1);
    const leavesGeometry = new THREE.TetrahedronGeometry(3, 0);
    
    // Créer le matériau pour les troncs
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: config.colors.trunkColor,
        flatShading: true,
        roughness: 1.0,
        metalness: 0.0
    });
    
    // Pour chaque île, ajouter des arbres adaptés à son biome
    for (const island of config.islands) {
        // Créer le matériau pour les feuilles selon le biome
        const leavesMaterial = new THREE.MeshStandardMaterial({
            color: config.biomes[island.biome].treeColor,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Nombre d'arbres adapté à la taille de l'île
        const numTrees = Math.floor(config.numTreesPerIsland * (island.radius / 400));
        
        // Ajouter des arbres
        for (let i = 0; i < numTrees; i++) {
            // Position aléatoire sur l'île
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * island.radius * 0.8; // Éviter les bords
            
            const x = Math.cos(angle) * radius + island.center.x;
            const z = Math.sin(angle) * radius + island.center.z;
            
            // Obtenir la hauteur du terrain à cette position
            const height = getTerrainHeightAtPosition(x, z);
            
            // Ne pas placer d'arbres dans l'eau ou sur la montagne
            if (height <= config.waterLevel + 2 || height > 100) continue;
            
            // Créer un groupe pour l'arbre
            const treeGroup = new THREE.Group();
            
            // Hauteur aléatoire pour l'arbre (adaptée au biome)
            let treeMinHeight = config.treeMinHeight;
            let treeMaxHeight = config.treeMaxHeight;
            
            // Ajuster la hauteur des arbres selon le biome
            if (island.biome === 'tropical') {
                treeMinHeight = 10; // Arbres plus grands dans les tropiques
                treeMaxHeight = 25;
            } else if (island.biome === 'desert') {
                treeMinHeight = 5; // Arbres plus petits dans le désert
                treeMaxHeight = 12;
            }
            
            const treeHeight = treeMinHeight + Math.random() * (treeMaxHeight - treeMinHeight);
            
            // Créer le tronc
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.scale.set(1, treeHeight, 1);
            trunk.position.y = treeHeight / 2;
            trunk.castShadow = config.enableShadows;
            treeGroup.add(trunk);
            
            // Créer les feuilles (forme adaptée au biome)
            let leaves;
            
            if (island.biome === 'tropical') {
                // Arbres tropicaux avec plusieurs niveaux de feuilles
                const leavesGroup = new THREE.Group();
                
                for (let j = 0; j < 3; j++) {
                    const leafLayer = new THREE.Mesh(leavesGeometry, leavesMaterial);
                    const scale = 2.5 - j * 0.5;
                    leafLayer.scale.set(scale, scale, scale);
                    leafLayer.position.y = treeHeight - j * 3;
                    leafLayer.castShadow = config.enableShadows;
                    leavesGroup.add(leafLayer);
                }
                
                treeGroup.add(leavesGroup);
            } else if (island.biome === 'desert') {
                // Cactus ou arbres du désert (plus fins)
                trunk.scale.set(0.7, treeHeight, 0.7);
                
                leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.scale.set(1.5, 1.5, 1.5);
                leaves.position.y = treeHeight + 1;
                leaves.castShadow = config.enableShadows;
                treeGroup.add(leaves);
            } else {
                // Arbres standard
                leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.scale.set(2, 2, 2);
                leaves.position.y = treeHeight + 2;
                leaves.castShadow = config.enableShadows;
                treeGroup.add(leaves);
            }
            
            // Positionner l'arbre
            treeGroup.position.set(x, height, z);
            
            // Rotation aléatoire
            treeGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Ajouter à la scène
            scene.add(treeGroup);
        }
    }
}

/**
 * Calcule la hauteur du terrain à une position donnée
 */
export function getTerrainHeightAtPosition(x, z) {
    // Si les hauteurs de terrain n'ont pas encore été calculées, retourner 0
    if (!window.terrainHeights) return 0;
    
    // Trouver le point le plus proche dans le tableau des hauteurs
    let closestPoint = null;
    let closestDistance = Infinity;
    
    for (const point of window.terrainHeights) {
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2));
        if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
        }
    }
    
    // Retourner la hauteur du point le plus proche
    return closestPoint ? closestPoint.height : 0;
}

/**
 * Gère le redimensionnement de la fenêtre
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Boucle d'animation
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Mettre à jour la position de l'eau pour qu'elle suive la caméra
    if (water) {
        water.position.x = camera.position.x;
        water.position.z = camera.position.z;
    }
    
    renderer.render(scene, camera);
}

/**
 * Crée une grille pour le débogage
 */
export function createGrid() {
    const gridSize = 2000;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x444444);
    scene.add(gridHelper);
}

/**
 * Ajoute des habitations sur les îles
 */
function addHouses() {
    // Créer des géométries de base pour les maisons
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
    
    // Matériaux pour les maisons
    const wallMaterials = {
        temperate: new THREE.MeshStandardMaterial({ color: 0xE5D3B3, flatShading: true }),
        tropical: new THREE.MeshStandardMaterial({ color: 0xFFE4C4, flatShading: true }),
        desert: new THREE.MeshStandardMaterial({ color: 0xDEB887, flatShading: true }),
        volcanic: new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true }),
        snowy: new THREE.MeshStandardMaterial({ color: 0xF5F5F5, flatShading: true })
    };
    
    const roofMaterials = {
        temperate: new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true }),
        tropical: new THREE.MeshStandardMaterial({ color: 0xCD853F, flatShading: true }),
        desert: new THREE.MeshStandardMaterial({ color: 0xD2691E, flatShading: true }),
        volcanic: new THREE.MeshStandardMaterial({ color: 0x696969, flatShading: true }),
        snowy: new THREE.MeshStandardMaterial({ color: 0x4682B4, flatShading: true })
    };
    
    // Pour chaque île
    for (const island of config.islands) {
        // Nombre de maisons adapté à la taille de l'île
        const numHouses = Math.floor(config.numHousesPerIsland * (island.radius / 400));
        
        // Ajouter des maisons
        for (let i = 0; i < numHouses; i++) {
            // Position aléatoire sur l'île (éviter les montagnes et l'eau)
            let attempts = 0;
            let validPosition = false;
            let x, z, height;
            
            while (!validPosition && attempts < 50) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * island.radius * 0.6; // Rester loin des bords
                
                x = Math.cos(angle) * radius + island.center.x;
                z = Math.sin(angle) * radius + island.center.z;
                height = getTerrainHeightAtPosition(x, z);
                
                // Vérifier si la position est valide (pas dans l'eau, pas trop en hauteur)
                if (height > config.waterLevel + 2 && height < 50) {
                    validPosition = true;
                }
                attempts++;
            }
            
            if (!validPosition) continue;
            
            // Créer un groupe pour la maison
            const houseGroup = new THREE.Group();
            
            // Taille aléatoire pour la maison
            const houseWidth = config.houseMinSize + Math.random() * (config.houseMaxSize - config.houseMinSize);
            const houseHeight = houseWidth * 0.8;
            
            // Base de la maison
            const base = new THREE.Mesh(baseGeometry, wallMaterials[island.biome]);
            base.scale.set(houseWidth, houseHeight, houseWidth);
            base.position.y = houseHeight / 2;
            base.castShadow = config.enableShadows;
            base.receiveShadow = config.enableShadows;
            houseGroup.add(base);
            
            // Toit
            const roof = new THREE.Mesh(roofGeometry, roofMaterials[island.biome]);
            roof.scale.set(houseWidth * 1.2, houseHeight * 0.6, houseWidth * 1.2);
            roof.position.y = houseHeight + (houseHeight * 0.3);
            roof.castShadow = config.enableShadows;
            roof.receiveShadow = config.enableShadows;
            houseGroup.add(roof);
            
            // Positionner la maison
            houseGroup.position.set(x, height, z);
            
            // Rotation aléatoire
            houseGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Ajouter à la scène
            scene.add(houseGroup);
        }
    }
}

/**
 * Met à jour les chunks visibles en fonction de la position du joueur
 */
function updateChunks(centerX, centerZ) {
    const chunksToLoad = new Set();
    const renderDist = config.renderDistance;
    
    // Déterminer quels chunks devraient être chargés
    for (let x = -renderDist; x <= renderDist; x++) {
        for (let z = -renderDist; z <= renderDist; z++) {
            const chunkX = centerX + x;
            const chunkZ = centerZ + z;
            const chunkKey = `${chunkX},${chunkZ}`;
            chunksToLoad.add(chunkKey);
            
            // Charger le chunk s'il n'existe pas déjà
            if (!loadedChunks.has(chunkKey)) {
                const chunk = generateChunk(chunkX, chunkZ);
                loadedChunks.set(chunkKey, chunk);
                scene.add(chunk);
            }
        }
    }
    
    // Décharger les chunks qui ne sont plus visibles
    for (const [key, chunk] of loadedChunks.entries()) {
        if (!chunksToLoad.has(key)) {
            scene.remove(chunk);
            chunk.geometry.dispose();
            chunk.material.dispose();
            loadedChunks.delete(key);
        }
    }
}

/**
 * Génère un nouveau chunk de terrain
 */
function generateChunk(chunkX, chunkZ) {
    const chunkWorldX = chunkX * config.chunkSize;
    const chunkWorldZ = chunkZ * config.chunkSize;
    
    // Créer la géométrie du chunk
    const geometry = new THREE.PlaneGeometry(
        config.chunkSize,
        config.chunkSize,
        config.terrainSegments / 2,
        config.terrainSegments / 2
    );
    
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(
        chunkWorldX + config.chunkSize / 2,
        0,
        chunkWorldZ + config.chunkSize / 2
    );
    
    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);
    
    // Générer des îles pour ce chunk si nécessaire
    const chunkIslands = generateIslandsForChunk(chunkX, chunkZ);
    
    // Modifier les hauteurs pour créer le terrain
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        let height = -5; // Niveau de base (sous l'eau)
        let nearestIsland = null;
        let minDistance = Infinity;
        
        // Vérifier la proximité avec les îles
        for (const island of chunkIslands) {
            const distanceToIsland = Math.sqrt(
                Math.pow(x - island.center.x, 2) + 
                Math.pow(z - island.center.z, 2)
            );
            
            if (distanceToIsland < island.radius && distanceToIsland < minDistance) {
                minDistance = distanceToIsland;
                nearestIsland = island;
            }
        }
        
        // Générer le terrain si on est près d'une île
        if (nearestIsland) {
            const distanceToCenter = minDistance;
            const falloff = Math.pow(1 - distanceToCenter / nearestIsland.radius, 1.5);
            
            // Utiliser le même système de génération que précédemment
            const seed = nearestIsland.seed;
            const baseNoise = (noise.noise(x * 0.005 + seed, z * 0.005 + seed) + 1) * 0.5;
            const detailNoise = (noise.noise(x * 0.02 + seed, z * 0.02 + seed) + 1) * 0.5;
            const combinedNoise = baseNoise * 0.7 + detailNoise * 0.3;
            
            height = nearestIsland.baseHeight + nearestIsland.mountainHeight * falloff * combinedNoise;
            
            // Appliquer les déformations de côte
            if (falloff < 0.3) {
                const coastalNoise = noise.noise(x * 0.1 + seed, z * 0.1 + seed);
                if (coastalNoise > 0.3) {
                    height += (coastalNoise - 0.3) * 30 * falloff;
                }
            }
        }
        
        // Appliquer la hauteur
        positions[i + 1] = height;
        
        // Déterminer la couleur
        let color = new THREE.Color(config.colors.water);
        
        if (nearestIsland && height > config.waterLevel) {
            const biomeColors = config.biomes[nearestIsland.biome];
            
            if (height <= config.waterLevel + 2) {
                color = new THREE.Color(biomeColors.beach);
            } else if (height < 30) {
                color = new THREE.Color(biomeColors.grass);
            } else if (height < 100) {
                color = new THREE.Color(biomeColors.forest);
            } else if (height < 200) {
                color = new THREE.Color(biomeColors.mountain);
            } else {
                color = new THREE.Color(biomeColors.snow);
            }
        }
        
        // Ajouter une variation de couleur
        const variation = (Math.random() - 0.5) * 0.05;
        color.r = Math.max(0, Math.min(1, color.r + variation));
        color.g = Math.max(0, Math.min(1, color.g + variation));
        color.b = Math.max(0, Math.min(1, color.b + variation));
        
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    // Mettre à jour la géométrie
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    // Créer le mesh
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const chunk = new THREE.Mesh(geometry, material);
    chunk.receiveShadow = config.enableShadows;
    chunk.castShadow = config.enableShadows;
    
    return chunk;
}

/**
 * Génère des îles pour un chunk donné
 */
function generateIslandsForChunk(chunkX, chunkZ) {
    const islands = [];
    const chunkSeed = (chunkX * 16384 + chunkZ) * 123456789;
    const random = seedrandom(chunkSeed.toString());
    
    // Décider si ce chunk doit avoir une île
    if (random() < config.islandDensity) {
        // Générer une position aléatoire dans le chunk
        const x = chunkX * config.chunkSize + random() * config.chunkSize;
        const z = chunkZ * config.chunkSize + random() * config.chunkSize;
        
        // Vérifier la distance avec les îles existantes des chunks voisins
        let tooClose = false;
        for (const [key, chunk] of loadedChunks) {
            const [otherX, otherZ] = key.split(',').map(Number);
            const otherIslands = chunk.userData.islands || [];
            
            for (const otherIsland of otherIslands) {
                const distance = Math.sqrt(
                    Math.pow(x - otherIsland.center.x, 2) + 
                    Math.pow(z - otherIsland.center.z, 2)
                );
                
                if (distance < config.minIslandSpacing) {
                    tooClose = true;
                    break;
                }
            }
            
            if (tooClose) break;
        }
        
        if (!tooClose) {
            // Créer une nouvelle île avec des paramètres aléatoires
            const biomes = Object.keys(config.biomes);
            const island = {
                center: { x, z },
                radius: 200 + random() * 300,
                mountainHeight: 100 + random() * 250,
                biome: biomes[Math.floor(random() * biomes.length)],
                seed: random() * 1000000,
                baseHeight: 5 + random() * 15
            };
            
            islands.push(island);
        }
    }
    
    return islands;
} 