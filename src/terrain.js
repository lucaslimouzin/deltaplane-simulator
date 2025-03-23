import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';
import seedrandom from 'seedrandom';

// Terrain configuration
const TERRAIN_SIZE = 2000;         // Size of each chunk
const RENDER_DISTANCE = 2;         // Render distance in chunks (reduced from 3)
const PRELOAD_DISTANCE = 2;        // Preload distance (reduced from 3)
const CHUNK_FADE_DURATION = 500;   // Fade-in duration reduced to 500ms
const CHUNK_LOAD_DELAY = 100;      // Increased delay between chunk loads
const MAX_CHUNKS_PER_FRAME = 1;    // Reduced to 1 chunk per frame
const PRELOAD_EXTRA_DISTANCE = 1;  // Reduced extra preload distance

const config = {
    // General parameters
    terrainSize: TERRAIN_SIZE,
    waterSize: 12000,          // Reduced water plane size
    waterLevel: -0.5,
    
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
    fogNear: 2000,            // Reduced fog start distance
    fogFar: 6000,             // Reduced fog end distance
    fogDensity: 0.0005,       // Increased fog density for better culling
    
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
    terrainSegments: 80,      // Reduced segments for better performance (was 120)
    
    // Tree parameters
    numTreesPerIsland: 50,    // Reduced number of trees (was 80)
    treeMinHeight: 8,          // Minimum tree height
    treeMaxHeight: 20,         // Maximum tree height
    
    // House parameters
    numHousesPerIsland: 10,   // Reduced number of houses (was 15)
    houseMinSize: 5,
    houseMaxSize: 10,
    
    // LOD (Level of Detail) parameters
    lodLevels: {
        near: { distance: 2000, detail: 1.0 },    // Full detail
        medium: { distance: 4000, detail: 0.5 },   // Half detail
        far: { distance: 6000, detail: 0.25 }      // Quarter detail
    },
    
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
            beach: 0xE6E6FA,       // Light purple
            grass: 0xF0F8FF,       // White blue
            forest: 0xF5F5F5,      // White
            mountain: 0xDCDCDC,    // Light gray
            snow: 0xFFFFFF,        // Pure white
            treeColor: 0x90EE90    // Light green
        },
        savanna: {
            beach: 0xF4D03F,       // Golden yellow
            grass: 0xDAA520,       // Golden grass
            forest: 0x796307,      // Dark olive
            mountain: 0xCD853F,    // Peru brown
            snow: 0xFFF8DC,        // Cornsilk
            treeColor: 0x556B2F    // Dark olive green
        },
        jungle: {
            beach: 0xFFE4B5,       // Moccasin
            grass: 0x228B22,       // Forest green
            forest: 0x006400,      // Dark green
            mountain: 0x8B4513,    // Saddle brown
            snow: 0x98FB98,        // Pale green
            treeColor: 0x228B22    // Forest green
        },
        tundra: {
            beach: 0xD3D3D3,       // Light gray
            grass: 0x708090,       // Slate gray
            forest: 0x2F4F4F,      // Dark slate gray
            mountain: 0x4F4F4F,    // Gray
            snow: 0xF0FFFF,        // Azure
            treeColor: 0x2F4F4F    // Dark slate gray
        },
        village: {
            beach: 0xE6CCB3,       // Light beige (pavés)
            grass: 0x90EE90,       // Light green (jardins)
            forest: 0x228B22,      // Forest green (parcs)
            mountain: 0xB8860B,    // Dark golden (toits)
            snow: 0xDCDCDC,        // Light gray (routes)
            treeColor: 0x228B22    // Forest green
        },
        city: {
            beach: 0x808080,       // Gray (trottoirs)
            grass: 0x98FB98,       // Pale green (espaces verts)
            forest: 0x006400,      // Dark green (parcs urbains)
            mountain: 0x696969,    // Dim gray (buildings)
            snow: 0x363636,        // Dark gray (routes)
            treeColor: 0x006400    // Dark green
        },
        megalopolis: {
            beach: 0x4A4A4A,       // Dark gray (béton)
            grass: 0x2E8B57,       // Sea green (parcs modernes)
            forest: 0x004225,      // Very dark green (zones vertes)
            mountain: 0x1C1C1C,    // Very dark gray (gratte-ciels)
            snow: 0x0F0F0F,        // Almost black (routes)
            treeColor: 0x2E8B57    // Sea green
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
    // Create shared geometries
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 1, 4, 1);
    const leavesGeometry = new THREE.TetrahedronGeometry(3, 0);
    
    // Create shared materials
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: config.colors.trunkColor,
        flatShading: true,
        roughness: 1.0,
        metalness: 0.0
    });
    
    const leavesMaterials = {};
    
    // Pre-create materials for each biome
    for (const biome in config.biomes) {
        leavesMaterials[biome] = new THREE.MeshStandardMaterial({
            color: config.biomes[biome].treeColor,
            flatShading: true,
            roughness: 0.8,
            metalness: 0.0
        });
    }
    
    // For each island
    for (const island of chunk.islands) {
        const numTrees = island.numTrees || Math.floor(config.numTreesPerIsland * (island.radius / 400));
        const leavesMaterial = leavesMaterials[island.biome];
        
        // Create instanced mesh for trunks and leaves
        const trunkInstanced = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, numTrees);
        const leavesInstanced = new THREE.InstancedMesh(leavesGeometry, leavesMaterial, numTrees);
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const rotation = new THREE.Euler();
        
        for (let i = 0; i < numTrees; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * island.radius * 0.8;
            
            position.x = Math.cos(angle) * radius + island.center.x;
            position.z = Math.sin(angle) * radius + island.center.z;
            position.y = getTerrainHeightAtPosition(position.x, position.z);
            
            if (position.y <= config.waterLevel + 2 || position.y > 100) continue;
            
            // Trunk
            const treeHeight = config.treeMinHeight + Math.random() * (config.treeMaxHeight - config.treeMinHeight);
            scale.set(1, treeHeight, 1);
            rotation.y = Math.random() * Math.PI * 2;
            
            matrix.makeRotationFromEuler(rotation);
            matrix.scale(scale);
            matrix.setPosition(position.x, position.y + treeHeight / 2, position.z);
            trunkInstanced.setMatrixAt(i, matrix);
            
            // Leaves
            scale.set(2, 2, 2);
            matrix.makeRotationFromEuler(rotation);
            matrix.scale(scale);
            matrix.setPosition(position.x, position.y + treeHeight + 2, position.z);
            leavesInstanced.setMatrixAt(i, matrix);
        }
        
        trunkInstanced.castShadow = config.enableShadows;
        trunkInstanced.receiveShadow = config.enableShadows;
        leavesInstanced.castShadow = config.enableShadows;
        leavesInstanced.receiveShadow = config.enableShadows;
        
        scene.add(trunkInstanced);
        scene.add(leavesInstanced);
        chunk.objects.push(trunkInstanced, leavesInstanced);
    }
}

/**
 * Adds houses to a specific chunk
 */
function addHousesToChunk(chunk) {
    // Create shared geometries
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    const roofGeometry = new THREE.ConeGeometry(1, 1, 4);
    const skyscraperGeometry = new THREE.BoxGeometry(1, 1, 1);
    
    // Pre-create all materials
    const materials = {
        village: {
            wall: new THREE.MeshStandardMaterial({ color: 0xE5D3B3, flatShading: true }),
            roof: new THREE.MeshStandardMaterial({ color: 0x8B4513, flatShading: true })
        },
        city: {
            wall: new THREE.MeshStandardMaterial({ color: 0xA0A0A0, flatShading: true }),
            roof: new THREE.MeshStandardMaterial({ color: 0x696969, flatShading: true })
        },
        megalopolis: {
            wall: new THREE.MeshStandardMaterial({ color: 0x505050, flatShading: true }),
            roof: new THREE.MeshStandardMaterial({ color: 0x303030, flatShading: true })
        }
    };
    
    // For each island
    for (const island of chunk.islands) {
        const numBuildings = island.numBuildings || config.numHousesPerIsland;
        
        // Create instanced meshes based on biome type
        let buildingInstances;
        
        switch(island.biome) {
            case 'village':
                buildingInstances = new THREE.InstancedMesh(baseGeometry, materials.village.wall, numBuildings);
                break;
            case 'city':
                buildingInstances = new THREE.InstancedMesh(skyscraperGeometry, materials.city.wall, numBuildings);
                break;
            case 'megalopolis':
                buildingInstances = new THREE.InstancedMesh(skyscraperGeometry, materials.megalopolis.wall, numBuildings);
                break;
            default:
                buildingInstances = new THREE.InstancedMesh(baseGeometry, materials.village.wall, numBuildings);
        }
        
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const rotation = new THREE.Euler();
        
        for (let i = 0; i < numBuildings; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * island.radius * 0.6;
            
            position.x = Math.cos(angle) * radius + island.center.x;
            position.z = Math.sin(angle) * radius + island.center.z;
            position.y = getTerrainHeightAtPosition(position.x, position.z);
            
            if (position.y <= config.waterLevel + 2 || position.y > 50) continue;
            
            let buildingWidth, buildingHeight;
            
            switch(island.biome) {
                case 'village':
                    buildingWidth = 5 + Math.random() * 5;
                    buildingHeight = buildingWidth * 0.8;
                    break;
                case 'city':
                    buildingWidth = 8 + Math.random() * 7;
                    buildingHeight = buildingWidth * 2;
                    break;
                case 'megalopolis':
                    buildingWidth = 10 + Math.random() * 10;
                    buildingHeight = buildingWidth * 4;
                    break;
                default:
                    buildingWidth = config.houseMinSize + Math.random() * (config.houseMaxSize - config.houseMinSize);
                    buildingHeight = buildingWidth * 0.8;
            }
            
            scale.set(buildingWidth, buildingHeight, buildingWidth);
            rotation.y = Math.random() * Math.PI * 2;
            
            matrix.makeRotationFromEuler(rotation);
            matrix.scale(scale);
            matrix.setPosition(position.x, position.y + buildingHeight / 2, position.z);
            buildingInstances.setMatrixAt(i, matrix);
        }
        
        buildingInstances.castShadow = config.enableShadows;
        buildingInstances.receiveShadow = config.enableShadows;
        
        scene.add(buildingInstances);
        chunk.objects.push(buildingInstances);
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
    
    // Animer les portails
    if (window.balloons) {
        window.balloons.forEach(portal => {
            if (portal.userData.mainParticles) {
                const time = Date.now() * 0.001;
                const positions = portal.userData.mainParticles.geometry.attributes.position.array;

                // Animer les particules principales (effet électrique)
                for (let i = 0; i < positions.length; i += 3) {
                    const angle = Math.atan2(positions[i + 2], positions[i + 1]);
                    const radius = Math.sqrt(positions[i + 1] * positions[i + 1] + positions[i + 2] * positions[i + 2]);
                    const newAngle = angle + (0.3 * Math.sin(time + radius));
                    
                    positions[i] = (Math.random() - 0.5) * 4; // X (profondeur) fluctuante
                    positions[i + 1] = Math.cos(newAngle) * radius; // Y (hauteur)
                    positions[i + 2] = Math.sin(newAngle) * radius; // Z (largeur)
                }
                portal.userData.mainParticles.geometry.attributes.position.needsUpdate = true;
            }

            if (portal.userData.secondaryParticles) {
                const time = Date.now() * 0.001;
                const positions = portal.userData.secondaryParticles.geometry.attributes.position.array;

                // Animer les particules secondaires (effet de brume)
                for (let i = 0; i < positions.length; i += 3) {
                    const angle = Math.atan2(positions[i + 2], positions[i + 1]);
                    const radius = Math.sqrt(positions[i + 1] * positions[i + 1] + positions[i + 2] * positions[i + 2]);
                    const newAngle = angle + 0.2;
                    
                    positions[i] = (Math.random() - 0.5) * 8; // X (profondeur) fluctuante
                    positions[i + 1] = Math.cos(newAngle) * radius; // Y (hauteur)
                    positions[i + 2] = Math.sin(newAngle) * radius; // Z (largeur)
                }
                portal.userData.secondaryParticles.geometry.attributes.position.needsUpdate = true;
            }

            // Animer les roches flottantes
            if (portal.userData.rocks) {
                const time = Date.now() * 0.001;
                portal.userData.rocks.forEach((rock, index) => {
                    const offset = index * (Math.PI * 2 / portal.userData.rocks.length);
                    rock.position.x = Math.sin(time + offset) * 3; // Oscillation en profondeur
                    rock.rotation.x += 0.002;
                    rock.rotation.y += 0.003;
                });
            }

            // Animation de l'anneau
            if (portal.userData.ring) {
                const time = Date.now() * 0.001;
                portal.userData.ring.material.emissiveIntensity = 0.5 + Math.sin(time * 2) * 0.3;
                portal.userData.ring.material.opacity = 0.8 + Math.sin(time * 3) * 0.2;
            }

            // Mettre à jour la rotation du texte
            if (window.portalTextUpdates) {
                window.portalTextUpdates.forEach(update => update());
            }
        });
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
            // Retirer les îles de la minimap
            if (window.minimap && chunk.islands) {
                chunk.islands.forEach(island => {
                    window.minimap.removeIsland(`${x},${z}-${island.center.x},${island.center.z}`);
                });
            }

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

    // Ajouter les îles à la minimap si elle existe
    if (window.minimap) {
        chunk.islands.forEach(island => {
            window.minimap.addIsland({
                x: island.center.x,
                z: island.center.z,
                id: `${chunkX},${chunkZ}-${island.center.x},${island.center.z}`
            });
        });
    }

    // Ajouter un ballon pour chaque île
    chunk.islands.forEach(island => {
        addPortalToIsland(island, chunk);
    });

    // Calculer la distance au chunk
    const distanceToCamera = Math.sqrt(
        Math.pow((chunkX * TERRAIN_SIZE) - camera.position.x, 2) +
        Math.pow((chunkZ * TERRAIN_SIZE) - camera.position.z, 2)
    );
    
    // Déterminer le niveau de détail
    let segmentCount = config.terrainSegments;
    let treeMultiplier = 1;
    let buildingMultiplier = 1;
    
    if (distanceToCamera > config.lodLevels.far.distance) {
        segmentCount = Math.floor(config.terrainSegments * config.lodLevels.far.detail);
        treeMultiplier = 0.25;
        buildingMultiplier = 0.25;
    } else if (distanceToCamera > config.lodLevels.medium.distance) {
        segmentCount = Math.floor(config.terrainSegments * config.lodLevels.medium.detail);
        treeMultiplier = 0.5;
        buildingMultiplier = 0.5;
    }
    
    // Create terrain geometry with adjusted detail level
    const geometry = new THREE.PlaneGeometry(
        TERRAIN_SIZE,
        TERRAIN_SIZE,
        segmentCount,
        segmentCount
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
    const numIslands = 2 + Math.floor(rng() * 3); // 2-4 islands per chunk
    
    const possibleBiomes = [
        'temperate', 'tropical', 'desert', 'volcanic', 'snowy',
        'savanna', 'jungle', 'tundra', 'village', 'city', 'megalopolis'
    ];
    
    for (let i = 0; i < numIslands; i++) {
        // Ajuster la taille des îles pour éviter les chevauchements
        const radius = 150 + rng() * 100;
        
        // Répartir les îles plus uniformément dans le chunk
        const angle = (i / numIslands) * Math.PI * 2 + rng() * (Math.PI / 2);
        const distanceFromCenter = (TERRAIN_SIZE * 0.3) * (0.5 + rng() * 0.5);
        const x = (chunkX * TERRAIN_SIZE) + Math.cos(angle) * distanceFromCenter;
        const z = (chunkZ * TERRAIN_SIZE) + Math.sin(angle) * distanceFromCenter;
        
        // Ajuster le nombre de bâtiments en fonction du biome
        const biome = possibleBiomes[Math.floor(rng() * possibleBiomes.length)];
        let numBuildings;
        
        switch(biome) {
            case 'village':
                numBuildings = 15 + Math.floor(rng() * 10); // 15-25 bâtiments
                break;
            case 'city':
                numBuildings = 30 + Math.floor(rng() * 20); // 30-50 bâtiments
                break;
            case 'megalopolis':
                numBuildings = 50 + Math.floor(rng() * 30); // 50-80 bâtiments
                break;
            default:
                numBuildings = config.numHousesPerIsland;
        }
        
        islands.push({
            center: {
                x: x,
                z: z
            },
            radius: radius,
            mountainHeight: 100 + rng() * 150,
            biome: biome,
            hasMountain: rng() > 0.3,
            mountains: rng() > 0.5 ? [
                {
                    x: rng() * 100 - 50,
                    z: rng() * 100 - 50,
                    height: 150 + rng() * 100
                },
                {
                    x: rng() * 100 - 50,
                    z: rng() * 100 - 50,
                    height: 100 + rng() * 100
                }
            ] : undefined,
            numBuildings: numBuildings // Ajouter le nombre de bâtiments
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

/**
 * Ajoute un ballon flottant au-dessus d'une île
 */
function addPortalToIsland(island, chunk) {
    // Chance aléatoire de 25% d'avoir un portail
    if (Math.random() > 0.25) {
        return;
    }

    // Vérifier la distance avec les autres portails existants
    if (window.balloons) {
        const MIN_PORTAL_DISTANCE = 300;
        for (const existingPortal of window.balloons) {
            const distance = Math.sqrt(
                Math.pow(existingPortal.position.x - island.center.x, 2) +
                Math.pow(existingPortal.position.z - island.center.z, 2)
            );
            if (distance < MIN_PORTAL_DISTANCE) {
                return;
            }
        }
    }

    // Créer le groupe du portail
    const portalGroup = new THREE.Group();
    portalGroup.userData.isPortal = true;

    // Charger le fichier JSON pour obtenir un portail aléatoire
    fetch('/data/portals.json')
        .then(response => response.json())
        .then(data => {
            const portals = data.portals;
            const randomPortal = portals[Math.floor(Math.random() * portals.length)];
            
            // Stocker les données du portail
            portalGroup.userData.portalData = randomPortal;

            // Créer le texte du portail
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 1024;
            canvas.height = 256;

            // Style du texte
            context.fillStyle = 'rgba(0, 0, 0, 0)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = 'bold 80px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';

            const text = randomPortal.titre;

            // Mesurer la largeur du texte
            const textMetrics = context.measureText(text);
            const textWidth = textMetrics.width;
            const padding = 60;

            // Calculer les dimensions du plan en fonction du texte
            const planeWidth = textWidth * 0.25 + padding;
            const planeHeight = 25;

            // Ajouter la bordure noire
            context.strokeStyle = 'black';
            context.lineWidth = 16;
            context.strokeText(text, canvas.width/2, canvas.height/2);

            // Texte blanc pur
            context.fillStyle = '#FFFFFF';
            context.fillText(text, canvas.width/2, canvas.height/2);

            // Créer la texture à partir du canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;

            // Créer le matériau pour le texte
            const textMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                side: THREE.DoubleSide,
                depthWrite: false,
                depthTest: false,
                fog: false,
                opacity: 1.0,
                alphaTest: 0.1
            });

            // Créer le plan avec les dimensions calculées
            const textGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
            const textMesh = new THREE.Mesh(textGeometry, textMaterial);
            
            // Positionner le texte
            textMesh.position.set(0, 60, 0);
            textMesh.renderOrder = 999;
            portalGroup.add(textMesh);

            // Créer les particules principales (effet électrique)
            const mainParticleCount = 800;
            const mainParticlesGeometry = new THREE.BufferGeometry();
            const mainPositions = new Float32Array(mainParticleCount * 3);
            const mainColors = new Float32Array(mainParticleCount * 3);

            for (let i = 0; i < mainParticleCount; i++) {
                const angle = (i / mainParticleCount) * Math.PI * 2;
                const radius = 35 + Math.random() * 8;
                
                mainPositions[i * 3] = (Math.random() - 0.5) * 4;
                mainPositions[i * 3 + 1] = Math.cos(angle) * radius;
                mainPositions[i * 3 + 2] = Math.sin(angle) * radius;

                mainColors[i * 3] = 0.7 + Math.random() * 0.3;
                mainColors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
                mainColors[i * 3 + 2] = 1;
            }

            mainParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(mainPositions, 3));
            mainParticlesGeometry.setAttribute('color', new THREE.BufferAttribute(mainColors, 3));

            const mainParticlesMaterial = new THREE.PointsMaterial({
                size: 1.2,
                transparent: true,
                opacity: 0.8,
                vertexColors: true,
                blending: THREE.AdditiveBlending
            });

            const mainParticles = new THREE.Points(mainParticlesGeometry, mainParticlesMaterial);

            // Créer les particules secondaires (effet de brume)
            const secondaryParticleCount = 500;
            const secondaryParticlesGeometry = new THREE.BufferGeometry();
            const secondaryPositions = new Float32Array(secondaryParticleCount * 3);
            const secondaryColors = new Float32Array(secondaryParticleCount * 3);

            for (let i = 0; i < secondaryParticleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 35;
                
                secondaryPositions[i * 3] = (Math.random() - 0.5) * 8;
                secondaryPositions[i * 3 + 1] = Math.cos(angle) * radius;
                secondaryPositions[i * 3 + 2] = Math.sin(angle) * radius;

                secondaryColors[i * 3] = 0.8;
                secondaryColors[i * 3 + 1] = 0.9;
                secondaryColors[i * 3 + 2] = 1;
            }

            secondaryParticlesGeometry.setAttribute('position', new THREE.BufferAttribute(secondaryPositions, 3));
            secondaryParticlesGeometry.setAttribute('color', new THREE.BufferAttribute(secondaryColors, 3));

            const secondaryParticlesMaterial = new THREE.PointsMaterial({
                size: 2.0,
                transparent: true,
                opacity: 0.3,
                vertexColors: true,
                blending: THREE.AdditiveBlending
            });

            const secondaryParticles = new THREE.Points(secondaryParticlesGeometry, secondaryParticlesMaterial);

            // Créer les roches flottantes
            const numRocks = 16;
            const rockGeometry = new THREE.TetrahedronGeometry(3.5, 0);
            const rockMaterial = new THREE.MeshStandardMaterial({
                color: 0x808080,
                roughness: 0.8,
                metalness: 0.1,
                flatShading: true
            });

            const rocks = [];
            for (let i = 0; i < numRocks; i++) {
                const rock = new THREE.Mesh(rockGeometry, rockMaterial);
                const angle = (i / numRocks) * Math.PI * 2;
                const radius = 42;
                
                rock.position.set(
                    (Math.random() - 0.5) * 5,
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius
                );
                
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                
                const rockColor = new THREE.Color(0x808080);
                const variation = (Math.random() - 0.5) * 0.2;
                rockColor.r += variation;
                rockColor.g += variation;
                rockColor.b += variation;
                rock.material = new THREE.MeshStandardMaterial({
                    color: rockColor,
                    roughness: 0.8,
                    metalness: 0.1,
                    flatShading: true
                });
                
                rock.scale.set(
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4
                );
                portalGroup.add(rock);
                rocks.push(rock);
            }

            // Ajouter tous les éléments au groupe
            portalGroup.add(mainParticles);
            portalGroup.add(secondaryParticles);

            // Obtenir la hauteur du terrain
            const terrainHeight = getTerrainHeightAtPosition(island.center.x, island.center.z);
            
            // Positionner le portail
            portalGroup.position.set(
                island.center.x,
                terrainHeight + 150,
                island.center.z
            );

            // Ajouter au chunk et à la scène
            scene.add(portalGroup);
            chunk.objects.push(portalGroup);

            // Ajouter à la liste des portails pour l'animation
            if (!window.balloons) window.balloons = [];
            window.balloons.push(portalGroup);

            // Ajouter les propriétés d'animation
            portalGroup.userData = {
                ...portalGroup.userData,
                mainParticles: mainParticles,
                secondaryParticles: secondaryParticles,
                rocks: rocks,
                initialRotation: portalGroup.rotation.clone(),
                textMesh: textMesh
            };

            // Modifier la fonction animate pour faire face à la caméra
            const updatePortalRotation = () => {
                if (camera) {
                    const direction = new THREE.Vector3();
                    direction.subVectors(camera.position, portalGroup.position);
                    const angle = Math.atan2(direction.x, direction.z);
                    
                    // Rotation du groupe entier pour faire face à la caméra
                    portalGroup.rotation.y = angle + Math.PI / 2;

                    // Rotation du texte pour qu'il reste droit et lisible
                    if (textMesh) {
                        textMesh.rotation.y = -angle - Math.PI / 2;
                        const distance = camera.position.distanceTo(portalGroup.position);
                        const scale = Math.max(0.8, Math.min(1.8, distance / 400));
                        textMesh.scale.set(scale, scale, 1);
                    }
                }
            };

            // Ajouter la fonction de mise à jour à la boucle d'animation
            if (!window.portalTextUpdates) window.portalTextUpdates = [];
            window.portalTextUpdates.push(updatePortalRotation);
        })
        .catch(error => {
            console.error('Erreur lors du chargement des portails:', error);
            // En cas d'erreur, on supprime le groupe du portail
            scene.remove(portalGroup);
            const index = chunk.objects.indexOf(portalGroup);
            if (index > -1) {
                chunk.objects.splice(index, 1);
            }
            if (window.balloons) {
                const balloonIndex = window.balloons.indexOf(portalGroup);
                if (balloonIndex > -1) {
                    window.balloons.splice(balloonIndex, 1);
                }
            }
        });
} 