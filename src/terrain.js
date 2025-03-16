import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import seedrandom from 'seedrandom';

// Configuration du terrain
const TERRAIN_SIZE = 2000;         // Taille de chaque chunk
const RENDER_DISTANCE = 2;         // Distance de rendu en chunks (2 = 5x5 grille)
const PRELOAD_DISTANCE = 3;        // Distance de préchargement (3 = 7x7 grille)
const CHUNK_FADE_DURATION = 1000;  // Durée du fade-in en millisecondes
const CHUNK_LOAD_DELAY = 50;       // Délai entre le chargement de chaque chunk
const MAX_CHUNKS_PER_FRAME = 2;    // Nombre maximum de chunks à charger par frame
const PRELOAD_EXTRA_DISTANCE = 2;  // Distance supplémentaire de préchargement dans la direction du mouvement

const config = {
    // Paramètres généraux
    terrainSize: TERRAIN_SIZE,
    waterSize: 14000,          // Taille du plan d'eau (augmentée pour couvrir 5x5 chunks)
    waterLevel: -0.5,          // Niveau de l'eau légèrement abaissé pour éviter le z-fighting
    
    // Paramètres de forme des îles
    islandShapeComplexity: 0.7,    // Complexité de la forme des îles (0-1)
    islandEdgeRoughness: 0.4,      // Rugosité des bords des îles (0-1)
    
    // Configuration des chunks
    chunks: Array(25).fill(null).map((_, index) => {
        const row = Math.floor(index / 5) - 2; // -2 à 2
        const col = (index % 5) - 2; // -2 à 2
        
        return {
            offset: { 
                x: col * TERRAIN_SIZE, 
                z: row * TERRAIN_SIZE 
            },
            islands: [
                {
                    center: { 
                        x: (col * TERRAIN_SIZE) + (Math.random() * 400 - 200),
                        z: (row * TERRAIN_SIZE) + (Math.random() * 400 - 200)
                    },
                    radius: 250 + Math.random() * 150,
                    mountainHeight: 150 + Math.random() * 200,
                    biome: ['temperate', 'tropical', 'desert', 'volcanic', 'snowy'][Math.floor(Math.random() * 5)],
                    hasMountain: Math.random() > 0.3,
                    mountains: Math.random() > 0.5 ? [
                        { 
                            x: Math.random() * 200 - 100,
                            z: Math.random() * 200 - 100,
                            height: 200 + Math.random() * 150
                        },
                        { 
                            x: Math.random() * 200 - 100,
                            z: Math.random() * 200 - 100,
                            height: 150 + Math.random() * 150
                        }
                    ] : undefined
                },
                Math.random() > 0.3 ? {
                    center: { 
                        x: (col * TERRAIN_SIZE) + (Math.random() * 800 - 400),
                        z: (row * TERRAIN_SIZE) + (Math.random() * 800 - 400)
                    },
                    radius: 200 + Math.random() * 100,
                    mountainHeight: 100 + Math.random() * 150,
                    biome: ['temperate', 'tropical', 'desert', 'volcanic', 'snowy'][Math.floor(Math.random() * 5)],
                    hasMountain: Math.random() > 0.5
                } : null,
                Math.random() > 0.5 ? {
                    center: { 
                        x: (col * TERRAIN_SIZE) + (Math.random() * 800 - 400),
                        z: (row * TERRAIN_SIZE) + (Math.random() * 800 - 400)
                    },
                    radius: 150 + Math.random() * 100,
                    mountainHeight: 100 + Math.random() * 100,
                    biome: ['temperate', 'tropical', 'desert', 'volcanic', 'snowy'][Math.floor(Math.random() * 5)],
                    hasMountain: Math.random() > 0.7
                } : null
            ].filter(Boolean) // Supprime les îles null
        };
    }),
    
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
    fogNear: 2500,             // Distance de début du brouillard (ajustée pour le carré 3x3)
    fogFar: 4000,              // Distance de fin du brouillard (plus dense)
    fogDensity: 0.002,         // Densité du brouillard exponentiel
};

// Variables globales
let scene, camera, renderer;
let terrain = new Map(); // Map pour stocker les chunks avec leurs coordonnées comme clé
let water;
let noise = new SimplexNoise();
let currentChunkCoords = { x: 0, z: 0 }; // Initialisation avec des valeurs par défaut
let chunkLoadQueue = [];
let isLoadingChunk = false;

/**
 * Initialise la scène Three.js
 */
export function initScene(container) {
    // Créer la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.fogColor);
    scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    
    // Créer la caméra
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);

    // Trouver une position de spawn valide sur une île
    let spawnX = 0, spawnZ = 0, spawnHeight = -1;
    const chunk = config.chunks[12]; // Chunk central (index 12 dans un tableau 5x5)
    
    // Chercher une position valide sur la première île du chunk central
    if (chunk && chunk.islands.length > 0) {
        const island = chunk.islands[0];
        const angle = Math.random() * Math.PI * 2;
        const radius = island.radius * 0.3; // 30% du rayon pour être bien sur l'île
        
        spawnX = Math.cos(angle) * radius + island.center.x;
        spawnZ = Math.sin(angle) * radius + island.center.z;
        spawnHeight = 50; // Hauteur de départ sécurisée
    }

    camera.position.set(spawnX, spawnHeight, spawnZ);
    camera.lookAt(spawnX, spawnHeight - 10, spawnZ - 100);

    // Initialiser les coordonnées du chunk actuel et la vélocité
    currentChunkCoords = {
        x: Math.floor(camera.position.x / TERRAIN_SIZE),
        z: Math.floor(camera.position.z / TERRAIN_SIZE)
    };
    camera.velocity = new THREE.Vector3();
    camera.lastPosition = camera.position.clone();
    
    // Créer le renderer avec des paramètres améliorés
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true
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
    
    // Créer l'eau
    createWater();
    
    // Initialiser le premier chunk
    updateChunks(currentChunkCoords.x, currentChunkCoords.z, new THREE.Vector3());
    
    // Gérer le redimensionnement de la fenêtre
    window.addEventListener('resize', onWindowResize);
    
    // Ajouter les contrôles de caméra
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // Désactive la rotation avec le clic gauche
    controls.enablePan = false;    // Désactive le déplacement avec le clic droit
    controls.enableZoom = false;   // Désactive le zoom avec la molette
    controls.enabled = false;      // Désactive complètement les contrôles
    
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
    // Créer les terrains pour chaque chunk
    config.chunks.forEach(chunk => {
        // Créer la géométrie du terrain pour ce chunk
        const geometry = new THREE.PlaneGeometry(
            config.terrainSize,
            config.terrainSize,
            config.terrainSegments,
            config.terrainSegments
        );
        
        // Rotation pour avoir un plan horizontal
        geometry.rotateX(-Math.PI / 2);
        
        // Déplacer le chunk à sa position
        geometry.translate(chunk.offset.x, 0, chunk.offset.z);
        
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
            for (let j = 0; j < chunk.islands.length; j++) {
                const island = chunk.islands[j];
                
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
                const island = chunk.islands[islandIndex];
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
            
            for (const island of chunk.islands) {
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
        const terrainChunk = new THREE.Mesh(geometry, material);
        terrainChunk.receiveShadow = config.enableShadows;
        terrainChunk.castShadow = config.enableShadows;
        
        // Ajouter à la scène
        scene.add(terrainChunk);
        
        // Ajouter des arbres et des habitations pour ce chunk
        addTreesToChunk(chunk);
        addHousesToChunk(chunk);
    });
}

/**
 * Ajoute des arbres sur un chunk spécifique
 */
function addTreesToChunk(chunk) {
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
    for (const island of chunk.islands) {
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
 * Ajoute des habitations sur un chunk spécifique
 */
function addHousesToChunk(chunk) {
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
    for (const island of chunk.islands) {
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

    // S'assurer que la vélocité de la caméra est initialisée
    if (!camera.velocity || !camera.lastPosition) {
        camera.velocity = new THREE.Vector3();
        camera.lastPosition = camera.position.clone();
        return; // Attendre le prochain frame pour commencer les calculs
    }

    // Mettre à jour la vélocité de la caméra
    camera.velocity.copy(camera.position).sub(camera.lastPosition);
    camera.lastPosition.copy(camera.position);

    // S'assurer que currentChunkCoords est initialisé
    if (!currentChunkCoords) {
        currentChunkCoords = {
            x: Math.floor(camera.position.x / TERRAIN_SIZE),
            z: Math.floor(camera.position.z / TERRAIN_SIZE)
        };
        return; // Attendre le prochain frame pour commencer les mises à jour
    }

    // Calculer les coordonnées du chunk actuel
    const camChunkX = Math.floor(camera.position.x / TERRAIN_SIZE);
    const camChunkZ = Math.floor(camera.position.z / TERRAIN_SIZE);

    // Vérifier si nous avons changé de chunk
    if (camChunkX !== currentChunkCoords.x || camChunkZ !== currentChunkCoords.z) {
        try {
            updateChunks(camChunkX, camChunkZ, camera.velocity);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des chunks:', error);
        }
    }
    
    renderer.render(scene, camera);
}

/**
 * Met à jour les chunks en fonction de la position de la caméra
 */
function updateChunks(centerX, centerZ, velocity = new THREE.Vector3()) {
    // S'assurer que currentChunkCoords existe et le mettre à jour
    if (!currentChunkCoords) {
        currentChunkCoords = { x: centerX, z: centerZ };
    } else {
        currentChunkCoords.x = centerX;
        currentChunkCoords.z = centerZ;
    }

    // Déterminer la direction du mouvement (avec une valeur par défaut si velocity est undefined)
    const moveDirection = new THREE.Vector2(velocity.x || 0, velocity.z || 0).normalize();
    
    // Calculer les chunks à charger
    const chunksToLoad = [];
    const visibleChunks = new Set();
    
    // Chunks visibles (distance de rendu normale)
    for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
        for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
            const chunkX = Math.floor(centerX + x);
            const chunkZ = Math.floor(centerZ + z);
            const key = `${chunkX},${chunkZ}`;
            visibleChunks.add(key);
            
            if (!terrain.has(key)) {
                chunksToLoad.push({
                    x: chunkX,
                    z: chunkZ,
                    priority: 1,
                    distance: Math.sqrt(x * x + z * z)
                });
            }
        }
    }
    
    // Préchargement dans la direction du mouvement
    if (moveDirection.length() > 0.1) {
        const preloadCenterX = centerX + moveDirection.x * PRELOAD_EXTRA_DISTANCE;
        const preloadCenterZ = centerZ + moveDirection.y * PRELOAD_EXTRA_DISTANCE;
        
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const chunkX = Math.floor(preloadCenterX + x);
                const chunkZ = Math.floor(preloadCenterZ + z);
                const key = `${chunkX},${chunkZ}`;
                
                if (!terrain.has(key) && !visibleChunks.has(key)) {
                    chunksToLoad.push({
                        x: chunkX,
                        z: chunkZ,
                        priority: 2,
                        distance: Math.sqrt(
                            Math.pow(chunkX - centerX, 2) + 
                            Math.pow(chunkZ - centerZ, 2)
                        )
                    });
                }
            }
        }
    }
    
    // Trier les chunks par priorité et distance
    chunksToLoad.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.distance - b.distance;
    });
    
    // Limiter le nombre de chunks à charger par frame
    chunksToLoad.splice(MAX_CHUNKS_PER_FRAME);
    
    // Ajouter les chunks à la file d'attente
    chunkLoadQueue.push(...chunksToLoad);
    
    // Supprimer les chunks trop éloignés
    for (const [key, chunk] of terrain.entries()) {
        const [x, z] = key.split(',').map(Number);
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) + 
            Math.pow(z - centerZ, 2)
        );
        
        if (distance > RENDER_DISTANCE + PRELOAD_EXTRA_DISTANCE) {
            // Supprimer le chunk
            chunk.dispose();
            terrain.delete(key);
        }
    }
    
    // Démarrer le processus de chargement si ce n'est pas déjà en cours
    if (!isLoadingChunk) {
        processChunkQueue();
    }
}

/**
 * Traite la file d'attente des chunks à charger
 */
function processChunkQueue() {
    if (chunkLoadQueue.length === 0) {
        isLoadingChunk = false;
        return;
    }
    
    isLoadingChunk = true;
    const nextChunk = chunkLoadQueue.shift();
    
    // Créer le chunk
    createChunk(nextChunk.x, nextChunk.z, () => {
        // Attendre un peu avant de charger le prochain chunk
        setTimeout(() => {
            processChunkQueue();
        }, CHUNK_LOAD_DELAY);
    });
}

/**
 * Crée un nouveau chunk avec un effet de fade-in
 */
function createChunk(chunkX, chunkZ, callback) {
    const chunk = {
        offset: {
            x: chunkX * TERRAIN_SIZE,
            z: chunkZ * TERRAIN_SIZE
        },
        islands: generateIslandsForChunk(chunkX, chunkZ),
        objects: [] // Pour stocker tous les objets Three.js de ce chunk
    };

    // Créer la géométrie du terrain
    const geometry = new THREE.PlaneGeometry(
        TERRAIN_SIZE,
        TERRAIN_SIZE,
        config.terrainSegments,
        config.terrainSegments
    );
    
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(chunk.offset.x, 0, chunk.offset.z);
    
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
        for (let j = 0; j < chunk.islands.length; j++) {
            const island = chunk.islands[j];
            
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
            const island = chunk.islands[islandIndex];
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
        
        for (const island of chunk.islands) {
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
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = config.enableShadows;
    terrainMesh.castShadow = config.enableShadows;
    
    chunk.objects.push(terrainMesh);
    scene.add(terrainMesh);
    
    // Ajouter des arbres et des maisons
    addTreesToChunk(chunk);
    addHousesToChunk(chunk);
    
    // Appliquer le fade-in à tous les objets du chunk
    chunk.objects.forEach(obj => {
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                    mat.transparent = true;
                    mat.opacity = 0;
                });
            } else {
                obj.material.transparent = true;
                obj.material.opacity = 0;
            }
        }
    });

    // Stocker le chunk
    terrain.set(`${chunkX},${chunkZ}`, chunk);

    // Animer le fade-in
    fadeInChunk(chunk, callback);
}

/**
 * Anime le fade-in d'un chunk
 */
function fadeInChunk(chunk, callback) {
    const startTime = performance.now();
    
    function animate() {
        const progress = (performance.now() - startTime) / CHUNK_FADE_DURATION;
        
        if (progress >= 1) {
            // Animation terminée
            chunk.objects.forEach(obj => {
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(mat => {
                            mat.opacity = 1;
                            mat.transparent = false;
                        });
                    } else {
                        obj.material.opacity = 1;
                        obj.material.transparent = false;
                    }
                }
            });
            if (callback) callback();
            return;
        }
        
        // Mettre à jour l'opacité
        const opacity = progress;
        chunk.objects.forEach(obj => {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => {
                        mat.opacity = opacity;
                    });
                } else {
                    obj.material.opacity = opacity;
                }
            }
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

/**
 * Anime le fade-out d'un chunk
 */
function fadeOutChunk(chunk, callback) {
    const startTime = performance.now();
    
    function animate() {
        const progress = (performance.now() - startTime) / (CHUNK_FADE_DURATION / 2);
        
        if (progress >= 1) {
            // Animation terminée
            if (callback) callback();
            return;
        }
        
        // Mettre à jour l'opacité
        const opacity = 1 - progress;
        chunk.objects.forEach(obj => {
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => {
                        mat.transparent = true;
                        mat.opacity = opacity;
                    });
                } else {
                    obj.material.transparent = true;
                    obj.material.opacity = opacity;
                }
            }
        });
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

/**
 * Génère des îles pour un chunk spécifique
 */
function generateIslandsForChunk(chunkX, chunkZ) {
    // Utiliser un seed basé sur les coordonnées du chunk pour une génération cohérente
    const rng = new seedrandom(`${chunkX},${chunkZ}`);
    
    const islands = [];
    const numIslands = 1 + Math.floor(rng() * 2); // 1-2 îles par chunk
    
    for (let i = 0; i < numIslands; i++) {
        islands.push({
            center: {
                x: (chunkX * TERRAIN_SIZE) + (rng() * TERRAIN_SIZE * 0.8 - TERRAIN_SIZE * 0.4),
                z: (chunkZ * TERRAIN_SIZE) + (rng() * TERRAIN_SIZE * 0.8 - TERRAIN_SIZE * 0.4)
            },
            radius: 250 + rng() * 150,
            mountainHeight: 150 + rng() * 200,
            biome: ['temperate', 'tropical', 'desert', 'volcanic', 'snowy'][Math.floor(rng() * 5)],
            hasMountain: rng() > 0.3,
            mountains: rng() > 0.5 ? [
                {
                    x: rng() * 200 - 100,
                    z: rng() * 200 - 100,
                    height: 200 + rng() * 150
                },
                {
                    x: rng() * 200 - 100,
                    z: rng() * 200 - 100,
                    height: 150 + rng() * 150
                }
            ] : undefined
        });
    }
    
    return islands;
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