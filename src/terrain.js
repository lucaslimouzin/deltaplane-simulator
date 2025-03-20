import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import seedrandom from 'seedrandom';

// Terrain configuration
const TERRAIN_SIZE = 2000;         // Size of each chunk
const RENDER_DISTANCE = 2;         // Render distance in chunks (2 = 5x5 grid)
const PRELOAD_DISTANCE = 3;        // Preload distance (3 = 7x7 grid)
const CHUNK_FADE_DURATION = 1000;  // Fade-in duration in milliseconds
const CHUNK_LOAD_DELAY = 50;       // Delay between each chunk load
const MAX_CHUNKS_PER_FRAME = 2;    // Maximum number of chunks to load per frame
const PRELOAD_EXTRA_DISTANCE = 2;  // Extra preload distance in movement direction

const config = {
    // General parameters
    terrainSize: TERRAIN_SIZE,
    waterSize: 14000,          // Water plane size (increased to cover 5x5 chunks)
    waterLevel: -0.5,          // Water level slightly lowered to avoid z-fighting
    
    // Island shape parameters
    islandShapeComplexity: 0.7,    // Island shape complexity (0-1)
    islandEdgeRoughness: 0.4,      // Island edge roughness (0-1)
    islandMinRadius: 100,          // Minimum island radius
    islandMaxRadius: 300,          // Maximum island radius
    islandHeightScale: 100,        // Island height scale
    islandHeightOffset: 0,         // Island height offset
    
    // Noise parameters for terrain generation
    noiseScale: 100,           // Base noise scale
    noiseOctaves: 4,          // Number of noise octaves
    noisePersistence: 0.5,    // Noise persistence between octaves
    noiseLacunarity: 2,       // Noise frequency multiplier between octaves
    
    // Material parameters
    grassColor: 0x3c8f3c,     // Grass color (light green)
    sandColor: 0xc2b280,      // Sand color (beige)
    rockColor: 0x808080,      // Rock color (gray)
    waterColor: 0x0077be,     // Water color (blue)
    
    // Lighting parameters
    ambientColor: 0xffffff,   // Ambient light color (white)
    ambientIntensity: 0.5,    // Ambient light intensity
    sunColor: 0xffffff,       // Sun color (white)
    sunIntensity: 1.0,        // Sun intensity
    sunPosition: {            // Sun position
        x: 100,
        y: 100,
        z: 100
    },
    
    // Fog parameters
    fogColor: 0x87ceeb,       // Fog color (sky blue)
    fogNear: 2500,             // Distance where fog starts (increased from 100)
    fogFar: 6000,              // Distance where fog ends (increased from 3000)
    fogDensity: 0.0005,        // Exponential fog density (reduced from 0.002)
    
    // Configuration of chunks
    chunks: Array(25).fill(null).map((_, index) => {
        const row = Math.floor(index / 5) - 2; // -2 to 2
        const col = (index % 5) - 2; // -2 to 2
        
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
            ].filter(Boolean) // Remove null islands
        };
    }),
    
    // Terrain parameters
    terrainSegments: 120,      // Number of segments for the terrain (increased for more detail)
    
    // Tree parameters
    numTreesPerIsland: 80,     // Number of trees per island
    treeMinHeight: 8,          // Minimum tree height
    treeMaxHeight: 20,         // Maximum tree height
    
    // House parameters
    numHousesPerIsland: 15,
    houseMinSize: 5,
    houseMaxSize: 10,
    
    // Biome colors
    biomes: {
        temperate: {
            beach: 0xFFE66D,       // Sand
            grass: 0x7BC950,       // Light green
            forest: 0x2D936C,      // Dark green
            mountain: 0x9B7653,    // Brown
            snow: 0xFFFAFA,        // White
            treeColor: 0x2D936C    // Green for leaves
        },
        tropical: {
            beach: 0xFFF2CC,       // Light sand
            grass: 0x9DE649,       // Bright green
            forest: 0x45B69C,      // Turquoise
            mountain: 0xB3A369,    // Beige
            snow: 0xFFFFFF,        // White
            treeColor: 0x45B69C    // Turquoise for leaves
        },
        desert: {
            beach: 0xF6D7B0,       // Golden sand
            grass: 0xD4AC6E,       // Beige
            forest: 0x7D6608,      // Olive green
            mountain: 0xAA6C39,    // Brun
            snow: 0xF0E68C,        // Pale yellow
            treeColor: 0x7D6608    // Olive green for leaves
        },
        volcanic: {
            beach: 0x696969,       // Dark gray
            grass: 0x8B4513,       // Brun
            forest: 0x556B2F,      // Dark olive green
            mountain: 0x3D3635,    // Very dark gray
            snow: 0xFF4500,        // Orange red (lava)
            treeColor: 0x556B2F    // Dark olive green for leaves
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
    
    // General colors
    colors: {
        water: 0x4ECDC4,       // Turquoise
        trunkColor: 0x8B4513,  // Brown for trunks
    },
    
    // Visual parameters
    enableShadows: true,
    fogColor: 0x87CEEB,        // Fog color (sky blue)
    fogNear: 2500,             // Distance where fog starts (adjusted for 3x3 square)
    fogFar: 4000,              // Distance where fog ends (denser)
    fogDensity: 0.002,         // Exponential fog density
};

// Global variables
let scene, camera, renderer;
let terrain = new Map(); // Map to store chunks with their coordinates as key
let water;
let noise = new SimplexNoise();
let currentChunkCoords = { x: 0, z: 0 }; // Initialize with default values
let chunkLoadQueue = [];
let isLoadingChunk = false;

/**
 * Initializes the Three.js scene
 */
export function initScene(container) {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.fogColor);
    scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 8000);

    // Find a valid spawn position on an island
    let spawnX = 0, spawnZ = 0, spawnHeight = -1;
    const chunk = config.chunks[12]; // Central chunk (index 12 in a 5x5 array)
    
    // Look for a valid position on the first island of the central chunk
    if (chunk && chunk.islands.length > 0) {
        const island = chunk.islands[0];
        const angle = Math.random() * Math.PI * 2;
        const radius = island.radius * 0.3; // 30% of radius to be well on the island
        
        spawnX = Math.cos(angle) * radius + island.center.x;
        spawnZ = Math.sin(angle) * radius + island.center.z;
        spawnHeight = 50; // Safe starting height
    }

    camera.position.set(spawnX, spawnHeight, spawnZ);
    camera.lookAt(spawnX, spawnHeight - 10, spawnZ - 100);

    // Initialize current chunk coordinates and velocity
    currentChunkCoords = {
        x: Math.floor(camera.position.x / TERRAIN_SIZE),
        z: Math.floor(camera.position.z / TERRAIN_SIZE)
    };
    camera.velocity = new THREE.Vector3();
    camera.lastPosition = camera.position.clone();
    
    // Create renderer with improved parameters
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
    
    // Add renderer to container
    if (container) {
        container.appendChild(renderer.domElement);
    } else {
        document.body.appendChild(renderer.domElement);
    }
    
    // Add lights
    addLights();
    
    // Create water
    createWater();
    
    // Initialize first chunk
    updateChunks(currentChunkCoords.x, currentChunkCoords.z, new THREE.Vector3());
    
    // Handle window resizing
    window.addEventListener('resize', onWindowResize);
    
    // Add camera controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableRotate = false; // Disable rotation with left click
    controls.enablePan = false;    // Disable movement with right click
    controls.enableZoom = false;   // Disable zoom with scroll
    controls.enabled = false;      // Completely disable controls
    
    // Start animation loop
    animate();
    
    return { scene, camera, renderer };
}

/**
 * Adds lights to the scene
 */
function addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(500, 500, 0);
    directionalLight.castShadow = config.enableShadows;
    
    // Improved shadow configuration
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 3000;
    directionalLight.shadow.camera.left = -1500;
    directionalLight.shadow.camera.right = 1500;
    directionalLight.shadow.camera.top = 1500;
    directionalLight.shadow.camera.bottom = -1500;
    directionalLight.shadow.bias = -0.0005; // Add to reduce shadow artifacts
    
    scene.add(directionalLight);
}

/**
 * Creates islands with different biomes
 */
function createIslands() {
    // Create terrains for each chunk
    config.chunks.forEach(chunk => {
        // Create terrain geometry for this chunk
        const geometry = new THREE.PlaneGeometry(
            config.terrainSize,
            config.terrainSize,
            config.terrainSegments,
            config.terrainSegments
        );
        
        // Rotate for horizontal plane
        geometry.rotateX(-Math.PI / 2);
        
        // Move chunk to its position
        geometry.translate(chunk.offset.x, 0, chunk.offset.z);
        
        // Get vertex positions
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);
        
        // Create array to store heights (for getTerrainHeightAtPosition function)
        window.terrainHeights = [];
        
        // Modify heights to create multiple islands
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2];
            
            // Initialize height to 0 (under water)
            let height = -5;
            let islandIndex = -1;
            let minDistance = Infinity;
            
            // Determine which island this point belongs to (closest)
            for (let j = 0; j < chunk.islands.length; j++) {
                const island = chunk.islands[j];
                
                // Calculate base distance to island center
                const baseDistance = Math.sqrt(
                    Math.pow(x - island.center.x, 2) + 
                    Math.pow(z - island.center.z, 2)
                );
                
                // Apply deformation to distance to create non-circular shapes
                let distanceToIsland = baseDistance;
                
                // Use Perlin noise to deform island contour
                const angle = Math.atan2(z - island.center.z, x - island.center.x);
                const noiseScale = 2.0; // Noise scale
                
                // Seed specific to each island for different shapes
                const seed = j * 1000;
                
                // Deformation based on angle (creates bays and peninsulas)
                const angleNoise = (noise.noise(Math.cos(angle) * noiseScale + seed, Math.sin(angle) * noiseScale + seed) + 1) * 0.5;
                
                // Deformation based on position (creates local irregularities)
                const posNoise = (noise.noise((x * 0.01) + seed, (z * 0.01) + seed) + 1) * 0.5;
                
                // Combine deformations
                const deformation = island.radius * config.islandShapeComplexity * (angleNoise * 0.7 + posNoise * 0.3);
                
                // Add smaller variations to island edges for roughness
                const edgeNoise = (noise.noise((x * 0.05) + seed, (z * 0.05) + seed) + 1) * 0.5;
                const edgeDeformation = island.radius * config.islandEdgeRoughness * edgeNoise * 0.2;
                
                // Apply deformations to distance
                distanceToIsland = baseDistance - deformation - edgeDeformation;
                
                // Check if this point is in the deformed island
                if (distanceToIsland < island.radius && distanceToIsland < minDistance) {
                    minDistance = distanceToIsland;
                    islandIndex = j;
                }
            }
            
            // If point belongs to an island
            if (islandIndex >= 0) {
                const island = chunk.islands[islandIndex];
                const distanceToCenter = minDistance;
                
                // Attenuation factor towards edges (more progressive for irregular shapes)
                const falloff = Math.pow(1 - distanceToCenter / island.radius, 1.5);
                
                // Noise for terrain variations specific to each island
                const seed = islandIndex * 1000;
                const baseNoiseScale = 0.005;
                const detailNoiseScale = 0.02;
                
                const baseNoise = (noise.noise(x * baseNoiseScale + seed, z * baseNoiseScale + seed) + 1) * 0.5;
                const detailNoise = (noise.noise(x * detailNoiseScale + seed, z * detailNoiseScale + seed) + 1) * 0.5;
                
                const combinedNoise = baseNoise * 0.7 + detailNoise * 0.3;
                
                // Base height of island (varies by biome)
                const baseHeight = island.biome === 'snowy' ? 20 : (island.biome === 'desert' ? 3 : 5);
                height = baseHeight + 15 * falloff;
                
                // Handle multiple mountains if they are defined
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
                
                // Add terrain variations specific to biome
                if (island.biome === 'desert') {
                    // Dunes for desert
                    height += (noise.noise(x * 0.03 + seed, z * 0.03 + seed) * 0.5 + 0.5) * 10 * falloff;
                } else if (island.biome === 'tropical') {
                    // More hilly terrain for tropical island
                    height += combinedNoise * 12 * falloff;
                } else if (island.biome === 'volcanic') {
                    // More accident terrain for volcanic island
                    height += (noise.noise(x * 0.04 + seed, z * 0.04 + seed) * 0.5) * 15 * falloff;
                } else {
                    // Standard variations for temperate island
                    height += combinedNoise * 10 * falloff;
                }
                
                // Special case for snowy biome
                if (island.biome === 'snowy') {
                    // Add more variations to create cones
                    height += (noise.noise(x * 0.05 + seed, z * 0.05 + seed) * 0.5) * 20 * falloff;
                    // Ensure minimum snow coverage
                    if (height > config.waterLevel + 5) {
                        height += 5;
                    }
                }
                
                // Add additional variations for coasts
                // This creates varied beaches, cliffs, and coastal zones
                if (falloff < 0.3) {
                    const coastalNoise = noise.noise(x * 0.1 + seed, z * 0.1 + seed);
                    
                    if (coastalNoise > 0.3) {
                        // Create cliffs on certain coasts
                        height += (coastalNoise - 0.3) * 30 * falloff;
                    } else if (coastalNoise < -0.3) {
                        // Create more flat beaches on other coasts
                        height -= Math.abs(coastalNoise + 0.3) * 5;
                    }
                }
            }
            
            // Round height for low poly effect, but with smaller steps for more realism
            height = Math.round(height / 4) * 4;
            
            // Apply height
            positions[i + 1] = height;
            
            // Store height for getTerrainHeightAtPosition function
            window.terrainHeights.push({ x, z, height });
            
            // Determine color based on height and biome
            let color = new THREE.Color(0x4ECDC4); // Default color (water)
            
            // Find nearest island to determine biome
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
            
            // If a nearby island was found, use its biome colors
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
                
                // Special case for volcanic island: lava at top
                if (nearestIsland.biome === 'volcanic' && height > nearestIsland.mountainHeight * 0.8) {
                    // Mix with lava color
                    const lavaFactor = Math.min(1, (height - nearestIsland.mountainHeight * 0.8) / 50);
                    color.lerp(new THREE.Color(0xFF4500), lavaFactor);
                }
            }
            
            // Add slight color variation for more realism
            const variation = (Math.random() - 0.5) * 0.05;
            color.r = Math.max(0, Math.min(1, color.r + variation));
            color.g = Math.max(0, Math.min(1, color.g + variation));
            color.b = Math.max(0, Math.min(1, color.b + variation));
            
            // Assign color
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        // Update geometry
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.1
        });
        
        // Create mesh
        const terrainChunk = new THREE.Mesh(geometry, material);
        terrainChunk.receiveShadow = config.enableShadows;
        terrainChunk.castShadow = config.enableShadows;
        
        // Add to scene
        scene.add(terrainChunk);
        
        // Add trees and houses to this chunk
        addTreesToChunk(chunk);
        addHousesToChunk(chunk);
    });
}

/**
 * Adds trees to a specific chunk
 */
function addTreesToChunk(chunk) {
    // Create shared geometries for trees
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 1, 4, 1);
    const leavesGeometry = new THREE.TetrahedronGeometry(3, 0);
    
    // Create material for trunks
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: config.colors.trunkColor,
        flatShading: true,
        roughness: 1.0,
        metalness: 0.0
    });
    
    // For each island, add trees adapted to its biome
    for (const island of chunk.islands) {
        // Create material for leaves based on biome
        const leavesMaterial = new THREE.MeshStandardMaterial({
            color: config.biomes[island.biome].treeColor,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Number of trees adapted to island size
        const numTrees = Math.floor(config.numTreesPerIsland * (island.radius / 400));
        
        // Add trees
        for (let i = 0; i < numTrees; i++) {
            // Random position on island
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * island.radius * 0.8; // Avoid edges
            
            const x = Math.cos(angle) * radius + island.center.x;
            const z = Math.sin(angle) * radius + island.center.z;
            
            // Get terrain height at this position
            const height = getTerrainHeightAtPosition(x, z);
            
            // Do not place trees in water or on mountain
            if (height <= config.waterLevel + 2 || height > 100) continue;
            
            // Create tree group
            const treeGroup = new THREE.Group();
            
            // Random tree height (adapted to biome)
            let treeMinHeight = config.treeMinHeight;
            let treeMaxHeight = config.treeMaxHeight;
            
            // Adjust tree height based on biome
            if (island.biome === 'tropical') {
                treeMinHeight = 10; // Larger trees in tropics
                treeMaxHeight = 25;
            } else if (island.biome === 'desert') {
                treeMinHeight = 5; // Smaller trees in desert
                treeMaxHeight = 12;
            }
            
            const treeHeight = treeMinHeight + Math.random() * (treeMaxHeight - treeMinHeight);
            
            // Create trunk
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.scale.set(1, treeHeight, 1);
            trunk.position.y = treeHeight / 2;
            trunk.castShadow = config.enableShadows;
            treeGroup.add(trunk);
            
            // Create leaves (adapted shape for biome)
            let leaves;
            
            if (island.biome === 'tropical') {
                // Tropical trees with multiple leaf layers
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
                // Cactus or desert trees (finer)
                trunk.scale.set(0.7, treeHeight, 0.7);
                
                leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.scale.set(1.5, 1.5, 1.5);
                leaves.position.y = treeHeight + 1;
                leaves.castShadow = config.enableShadows;
                treeGroup.add(leaves);
            } else {
                // Standard trees
                leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.scale.set(2, 2, 2);
                leaves.position.y = treeHeight + 2;
                leaves.castShadow = config.enableShadows;
                treeGroup.add(leaves);
            }
            
            // Position tree
            treeGroup.position.set(x, height, z);
            
            // Random rotation
            treeGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            scene.add(treeGroup);
        }
    }
}

/**
 * Adds houses to a specific chunk
 */
function addHousesToChunk(chunk) {
    // Create base geometries for houses
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
    
    // Materials for houses
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
    
    // For each island
    for (const island of chunk.islands) {
        // Number of houses adapted to island size
        const numHouses = Math.floor(config.numHousesPerIsland * (island.radius / 400));
        
        // Add houses
        for (let i = 0; i < numHouses; i++) {
            // Random position on island (avoid mountains and water)
            let attempts = 0;
            let validPosition = false;
            let x, z, height;
            
            while (!validPosition && attempts < 50) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * island.radius * 0.6; // Stay away from edges
                
                x = Math.cos(angle) * radius + island.center.x;
                z = Math.sin(angle) * radius + island.center.z;
                height = getTerrainHeightAtPosition(x, z);
                
                // Check if position is valid (not in water, not too high)
                if (height > config.waterLevel + 2 && height < 50) {
                    validPosition = true;
                }
                attempts++;
            }
            
            if (!validPosition) continue;
            
            // Create house group
            const houseGroup = new THREE.Group();
            
            // Random house size
            const houseWidth = config.houseMinSize + Math.random() * (config.houseMaxSize - config.houseMinSize);
            const houseHeight = houseWidth * 0.8;
            
            // House base
            const base = new THREE.Mesh(baseGeometry, wallMaterials[island.biome]);
            base.scale.set(houseWidth, houseHeight, houseWidth);
            base.position.y = houseHeight / 2;
            base.castShadow = config.enableShadows;
            base.receiveShadow = config.enableShadows;
            houseGroup.add(base);
            
            // Roof
            const roof = new THREE.Mesh(roofGeometry, roofMaterials[island.biome]);
            roof.scale.set(houseWidth * 1.2, houseHeight * 0.6, houseWidth * 1.2);
            roof.position.y = houseHeight + (houseHeight * 0.3);
            roof.castShadow = config.enableShadows;
            roof.receiveShadow = config.enableShadows;
            houseGroup.add(roof);
            
            // Position house
            houseGroup.position.set(x, height, z);
            
            // Random rotation
            houseGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            scene.add(houseGroup);
        }
    }
}

/**
 * Creates water plane
 */
function createWater() {
    // Create water geometry
    const geometry = new THREE.PlaneGeometry(
        config.waterSize,
        config.waterSize,
        1,
        1
    );
    
    // Rotate for horizontal plane
    geometry.rotateX(-Math.PI / 2);
    
    // Position water at water level
    geometry.translate(0, config.waterLevel, 0);
    
    // Create material with improved parameters
    const material = new THREE.MeshStandardMaterial({
        color: config.colors.water,
        transparent: true,
        opacity: 0.8,
        flatShading: true,
        roughness: 0.1,
        metalness: 0.3,
        emissive: 0x1A9EAA,
        emissiveIntensity: 0.2,
        depthWrite: false, // Disable depth writing to avoid artifacts
        polygonOffset: true, // Enable polygon offset
        polygonOffsetFactor: -1, // Negative polygon offset factor to avoid z-fighting
        polygonOffsetUnits: -1
    });
    
    // Create mesh
    water = new THREE.Mesh(geometry, material);
    water.receiveShadow = false;
    water.renderOrder = 1; // Define render order to ensure water is rendered after terrain
    
    // Add to scene
    scene.add(water);
}

/**
 * Calculates terrain height at a given position
 */
export function getTerrainHeightAtPosition(x, z) {
    // If terrain heights haven't been calculated yet, return 0
    if (!window.terrainHeights) return 0;
    
    // Find closest point in terrain heights array
    let closestPoint = null;
    let closestDistance = Infinity;
    
    for (const point of window.terrainHeights) {
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.z - z, 2));
        if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
        }
    }
    
    // Return height of closest point
    return closestPoint ? closestPoint.height : 0;
}

/**
 * Handles window resizing
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Update water position to follow camera
    if (water) {
        water.position.x = camera.position.x;
        water.position.z = camera.position.z;
    }

    // Ensure camera velocity is initialized
    if (!camera.velocity || !camera.lastPosition) {
        camera.velocity = new THREE.Vector3();
        camera.lastPosition = camera.position.clone();
        return; // Wait for next frame to start calculations
    }

    // Update camera velocity
    camera.velocity.copy(camera.position).sub(camera.lastPosition);
    camera.lastPosition.copy(camera.position);

    // Ensure currentChunkCoords is initialized
    if (!currentChunkCoords) {
        currentChunkCoords = {
            x: Math.floor(camera.position.x / TERRAIN_SIZE),
            z: Math.floor(camera.position.z / TERRAIN_SIZE)
        };
        return; // Wait for next frame to start updates
    }

    // Calculate current chunk coordinates
    const camChunkX = Math.floor(camera.position.x / TERRAIN_SIZE);
    const camChunkZ = Math.floor(camera.position.z / TERRAIN_SIZE);

    // Check if we've changed chunks
    if (camChunkX !== currentChunkCoords.x || camChunkZ !== currentChunkCoords.z) {
        try {
            updateChunks(camChunkX, camChunkZ, camera.velocity);
        } catch (error) {
            console.error('Error updating chunks:', error);
        }
    }
    
    renderer.render(scene, camera);
}

/**
 * Updates chunks based on camera position
 */
function updateChunks(centerX, centerZ, velocity = new THREE.Vector3()) {
    // Ensure currentChunkCoords exists and update it
    if (!currentChunkCoords) {
        currentChunkCoords = { x: centerX, z: centerZ };
    } else {
        currentChunkCoords.x = centerX;
        currentChunkCoords.z = centerZ;
    }

    // Determine movement direction (with default if velocity is undefined)
    const moveDirection = new THREE.Vector2(velocity.x || 0, velocity.z || 0).normalize();
    
    // Calculate chunks to load
    const chunksToLoad = [];
    const visibleChunks = new Set();
    
    // Visible chunks (normal render distance)
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
    
    // Preload in movement direction
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
    
    // Sort chunks by priority and distance
    chunksToLoad.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        return a.distance - b.distance;
    });
    
    // Limit number of chunks to load per frame
    chunksToLoad.splice(MAX_CHUNKS_PER_FRAME);
    
    // Add chunks to load queue
    chunkLoadQueue.push(...chunksToLoad);
    
    // Remove chunks too far away
    for (const [key, chunk] of terrain.entries()) {
        const [x, z] = key.split(',').map(Number);
        const distance = Math.sqrt(
            Math.pow(x - centerX, 2) + 
            Math.pow(z - centerZ, 2)
        );
        
        if (distance > RENDER_DISTANCE + PRELOAD_EXTRA_DISTANCE) {
            // Remove chunk and dispose of its resources
            if (chunk.mesh && chunk.mesh.geometry) {
                chunk.mesh.geometry.dispose();
            }
            if (chunk.mesh && chunk.mesh.material) {
                if (Array.isArray(chunk.mesh.material)) {
                    chunk.mesh.material.forEach(material => material.dispose());
                } else {
                    chunk.mesh.material.dispose();
                }
            }
            if (chunk.mesh && chunk.mesh.parent) {
                chunk.mesh.parent.remove(chunk.mesh);
            }
            // Dispose of any additional objects in the chunk
            if (chunk.objects && Array.isArray(chunk.objects)) {
                chunk.objects.forEach(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(mat => mat.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                    if (obj.parent) obj.parent.remove(obj);
                });
            }
            terrain.delete(key);
        }
    }
    
    // Start loading process if not already in progress
    if (!isLoadingChunk) {
        processChunkQueue();
    }
}

/**
 * Processes chunk load queue
 */
function processChunkQueue() {
    if (chunkLoadQueue.length === 0) {
        isLoadingChunk = false;
        return;
    }
    
    isLoadingChunk = true;
    const nextChunk = chunkLoadQueue.shift();
    
    // Create chunk
    createChunk(nextChunk.x, nextChunk.z, () => {
        // Wait a bit before loading next chunk
        setTimeout(() => {
            processChunkQueue();
        }, CHUNK_LOAD_DELAY);
    });
}

/**
 * Creates a new chunk with a fade-in effect
 */
function createChunk(chunkX, chunkZ, callback) {
    const chunk = {
        offset: {
            x: chunkX * TERRAIN_SIZE,
            z: chunkZ * TERRAIN_SIZE
        },
        islands: generateIslandsForChunk(chunkX, chunkZ),
        objects: [] // For storing all Three.js objects in this chunk
    };

    // Create terrain geometry
    const geometry = new THREE.PlaneGeometry(
        TERRAIN_SIZE,
        TERRAIN_SIZE,
        config.terrainSegments,
        config.terrainSegments
    );
    
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(chunk.offset.x, 0, chunk.offset.z);
    
    // Get vertex positions
    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);
    
    // Create array to store heights (for getTerrainHeightAtPosition function)
    window.terrainHeights = [];
    
    // Modify heights to create multiple islands
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Initialize height to 0 (under water)
        let height = -5;
        let islandIndex = -1;
        let minDistance = Infinity;
        
        // Determine which island this point belongs to (closest)
        for (let j = 0; j < chunk.islands.length; j++) {
            const island = chunk.islands[j];
            
            // Calculate base distance to island center
            const baseDistance = Math.sqrt(
                Math.pow(x - island.center.x, 2) + 
                Math.pow(z - island.center.z, 2)
            );
            
            // Apply deformation to distance to create non-circular shapes
            let distanceToIsland = baseDistance;
            
            // Use Perlin noise to deform island contour
            const angle = Math.atan2(z - island.center.z, x - island.center.x);
            const noiseScale = 2.0; // Noise scale
            
            // Seed specific to each island for different shapes
            const seed = j * 1000;
            
            // Deformation based on angle (creates bays and peninsulas)
            const angleNoise = (noise.noise(Math.cos(angle) * noiseScale + seed, Math.sin(angle) * noiseScale + seed) + 1) * 0.5;
            
            // Deformation based on position (creates local irregularities)
            const posNoise = (noise.noise((x * 0.01) + seed, (z * 0.01) + seed) + 1) * 0.5;
            
            // Combine deformations
            const deformation = island.radius * config.islandShapeComplexity * (angleNoise * 0.7 + posNoise * 0.3);
            
            // Add smaller variations to island edges for roughness
            const edgeNoise = (noise.noise((x * 0.05) + seed, (z * 0.05) + seed) + 1) * 0.5;
            const edgeDeformation = island.radius * config.islandEdgeRoughness * edgeNoise * 0.2;
            
            // Apply deformations to distance
            distanceToIsland = baseDistance - deformation - edgeDeformation;
            
            // Check if this point is in the deformed island
            if (distanceToIsland < island.radius && distanceToIsland < minDistance) {
                minDistance = distanceToIsland;
                islandIndex = j;
            }
        }
        
        // If point belongs to an island
        if (islandIndex >= 0) {
            const island = chunk.islands[islandIndex];
            const distanceToCenter = minDistance;
            
            // Attenuation factor towards edges (more progressive for irregular shapes)
            const falloff = Math.pow(1 - distanceToCenter / island.radius, 1.5);
            
            // Noise for terrain variations specific to each island
            const seed = islandIndex * 1000;
            const baseNoiseScale = 0.005;
            const detailNoiseScale = 0.02;
            
            const baseNoise = (noise.noise(x * baseNoiseScale + seed, z * baseNoiseScale + seed) + 1) * 0.5;
            const detailNoise = (noise.noise(x * detailNoiseScale + seed, z * detailNoiseScale + seed) + 1) * 0.5;
            
            const combinedNoise = baseNoise * 0.7 + detailNoise * 0.3;
            
            // Base height of island (varies by biome)
            const baseHeight = island.biome === 'snowy' ? 20 : (island.biome === 'desert' ? 3 : 5);
            height = baseHeight + 15 * falloff;
            
            // Handle multiple mountains if they are defined
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
            
            // Add terrain variations specific to biome
            if (island.biome === 'desert') {
                // Dunes for desert
                height += (noise.noise(x * 0.03 + seed, z * 0.03 + seed) * 0.5 + 0.5) * 10 * falloff;
            } else if (island.biome === 'tropical') {
                // More hilly terrain for tropical island
                height += combinedNoise * 12 * falloff;
            } else if (island.biome === 'volcanic') {
                // More accident terrain for volcanic island
                height += (noise.noise(x * 0.04 + seed, z * 0.04 + seed) * 0.5) * 15 * falloff;
            } else {
                // Standard variations for temperate island
                height += combinedNoise * 10 * falloff;
            }
            
            // Special case for snowy biome
            if (island.biome === 'snowy') {
                // Add more variations to create cones
                height += (noise.noise(x * 0.05 + seed, z * 0.05 + seed) * 0.5) * 20 * falloff;
                // Ensure minimum snow coverage
                if (height > config.waterLevel + 5) {
                    height += 5;
                }
            }
            
            // Add additional variations for coasts
            // This creates varied beaches, cliffs, and coastal zones
            if (falloff < 0.3) {
                const coastalNoise = noise.noise(x * 0.1 + seed, z * 0.1 + seed);
                
                if (coastalNoise > 0.3) {
                    // Create cliffs on certain coasts
                    height += (coastalNoise - 0.3) * 30 * falloff;
                } else if (coastalNoise < -0.3) {
                    // Create more flat beaches on other coasts
                    height -= Math.abs(coastalNoise + 0.3) * 5;
                }
            }
        }
        
        // Round height for low poly effect, but with smaller steps for more realism
        height = Math.round(height / 4) * 4;
        
        // Apply height
        positions[i + 1] = height;
        
        // Store height for getTerrainHeightAtPosition function
        window.terrainHeights.push({ x, z, height });
        
        // Determine color based on height and biome
        let color = new THREE.Color(0x4ECDC4); // Default color (water)
        
        // Find nearest island to determine biome
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
        
        // If a nearby island was found, use its biome colors
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
            
            // Special case for volcanic island: lava at top
            if (nearestIsland.biome === 'volcanic' && height > nearestIsland.mountainHeight * 0.8) {
                // Mix with lava color
                const lavaFactor = Math.min(1, (height - nearestIsland.mountainHeight * 0.8) / 50);
                color.lerp(new THREE.Color(0xFF4500), lavaFactor);
            }
        }
        
        // Add slight color variation for more realism
        const variation = (Math.random() - 0.5) * 0.05;
        color.r = Math.max(0, Math.min(1, color.r + variation));
        color.g = Math.max(0, Math.min(1, color.g + variation));
        color.b = Math.max(0, Math.min(1, color.b + variation));
        
        // Assign color
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    // Update geometry
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Create mesh
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = config.enableShadows;
    terrainMesh.castShadow = config.enableShadows;
    
    chunk.objects.push(terrainMesh);
    scene.add(terrainMesh);
    
    // Add trees and houses
    addTreesToChunk(chunk);
    addHousesToChunk(chunk);
    
    // Apply fade-in to all chunk objects
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

    // Store chunk
    terrain.set(`${chunkX},${chunkZ}`, chunk);

    // Animate fade-in
    fadeInChunk(chunk, callback);
}

/**
 * Animates fade-in of a chunk
 */
function fadeInChunk(chunk, callback) {
    const startTime = performance.now();
    
    function animate() {
        const progress = (performance.now() - startTime) / CHUNK_FADE_DURATION;
        
        if (progress >= 1) {
            // Animation completed
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
        
        // Update opacity
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
 * Animates fade-out of a chunk
 */
function fadeOutChunk(chunk, callback) {
    const startTime = performance.now();
    
    function animate() {
        const progress = (performance.now() - startTime) / (CHUNK_FADE_DURATION / 2);
        
        if (progress >= 1) {
            // Animation completed
            if (callback) callback();
            return;
        }
        
        // Update opacity
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
 * Generates islands for a specific chunk
 */
function generateIslandsForChunk(chunkX, chunkZ) {
    // Use seed based on chunk coordinates for consistent generation
    const rng = new seedrandom(`${chunkX},${chunkZ}`);
    
    const islands = [];
    const numIslands = 1 + Math.floor(rng() * 2); // 1-2 islands per chunk
    
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
 * Creates grid for debugging
 */
export function createGrid() {
    const gridSize = 2000;
    const gridDivisions = 20;
    const gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x444444);
    scene.add(gridHelper);
}

/**
 * Adds houses to islands
 */
function addHouses() {
    // Create base geometries for houses
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
    
    // Materials for houses
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
    
    // For each island
    for (const island of config.islands) {
        // Number of houses adapted to island size
        const numHouses = Math.floor(config.numHousesPerIsland * (island.radius / 400));
        
        // Add houses
        for (let i = 0; i < numHouses; i++) {
            // Random position on island (avoid mountains and water)
            let attempts = 0;
            let validPosition = false;
            let x, z, height;
            
            while (!validPosition && attempts < 50) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * island.radius * 0.6; // Stay away from edges
                
                x = Math.cos(angle) * radius + island.center.x;
                z = Math.sin(angle) * radius + island.center.z;
                height = getTerrainHeightAtPosition(x, z);
                
                // Check if position is valid (not in water, not too high)
                if (height > config.waterLevel + 2 && height < 50) {
                    validPosition = true;
                }
                attempts++;
            }
            
            if (!validPosition) continue;
            
            // Create house group
            const houseGroup = new THREE.Group();
            
            // Random house size
            const houseWidth = config.houseMinSize + Math.random() * (config.houseMaxSize - config.houseMinSize);
            const houseHeight = houseWidth * 0.8;
            
            // House base
            const base = new THREE.Mesh(baseGeometry, wallMaterials[island.biome]);
            base.scale.set(houseWidth, houseHeight, houseWidth);
            base.position.y = houseHeight / 2;
            base.castShadow = config.enableShadows;
            base.receiveShadow = config.enableShadows;
            houseGroup.add(base);
            
            // Roof
            const roof = new THREE.Mesh(roofGeometry, roofMaterials[island.biome]);
            roof.scale.set(houseWidth * 1.2, houseHeight * 0.6, houseWidth * 1.2);
            roof.position.y = houseHeight + (houseHeight * 0.3);
            roof.castShadow = config.enableShadows;
            roof.receiveShadow = config.enableShadows;
            houseGroup.add(roof);
            
            // Position house
            houseGroup.position.set(x, height, z);
            
            // Random rotation
            houseGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Add to scene
            scene.add(houseGroup);
        }
    }
} 