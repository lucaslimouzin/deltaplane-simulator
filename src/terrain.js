import * as THREE from 'three';

/**
 * Crée et retourne le terrain du simulateur
 * @param {THREE.Scene} scene - La scène Three.js
 * @returns {THREE.Mesh} Le mesh du terrain
 */
export function createTerrain(scene) {
    try {
        // Création d'un terrain plus grand
        const terrainSize = 5000; // Terrain encore plus grand
        
        // Créer l'île principale
        const island = createIsland(scene, terrainSize);
        
        // Créer l'océan
        const ocean = createOcean(scene, terrainSize);
        
        // Créer les montagnes
        const mountains = createMountains(scene);
        
        // Créer les nuages low poly
        addLowPolyClouds(scene);
        
        // Créer une petite ville
        createLowPolyCity(scene);
        
        // Créer des forêts
        createForests(scene);
        
        console.log("Terrain low poly créé avec succès");
        
        return island; // Retourner l'île comme terrain principal pour la détection de collision
    } catch (error) {
        console.error('Erreur lors de la création du terrain:', error);
        return null;
    }
}

/**
 * Crée l'île principale
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {number} terrainSize - La taille du terrain
 * @returns {THREE.Mesh} Le mesh de l'île
 */
function createIsland(scene, terrainSize) {
    // Créer la forme de l'île avec une géométrie personnalisée
    const islandSize = terrainSize * 0.4;
    const islandGeometry = new THREE.BufferGeometry();
    
    // Créer une forme d'île irrégulière
    const vertices = [];
    const indices = [];
    const resolution = 40; // Résolution de la grille
    const heightMap = generateHeightMap(resolution, resolution);
    
    // Générer les sommets
    for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
            // Position normalisée entre -0.5 et 0.5
            const nx = x / (resolution - 1) - 0.5;
            const nz = z / (resolution - 1) - 0.5;
            
            // Calculer la distance au centre
            const distToCenter = Math.sqrt(nx * nx + nz * nz) * 2;
            
            // Forme d'île: plus élevée au centre, s'abaisse vers les bords
            let height = 0;
            
            // Seulement créer l'île si on est dans un certain rayon
            if (distToCenter < 0.8) {
                // Hauteur de base de l'île
                height = Math.max(0, 20 * (1 - distToCenter / 0.8));
                
                // Ajouter des variations de hauteur pour les collines
                height += heightMap[z][x] * 15 * (1 - distToCenter / 0.8);
            }
            
            // Ajouter le sommet
            vertices.push(nx * islandSize, height, nz * islandSize);
        }
    }
    
    // Générer les triangles
    for (let z = 0; z < resolution - 1; z++) {
        for (let x = 0; x < resolution - 1; x++) {
            const a = z * resolution + x;
            const b = z * resolution + x + 1;
            const c = (z + 1) * resolution + x;
            const d = (z + 1) * resolution + x + 1;
            
            // Premier triangle
            indices.push(a, c, b);
            
            // Deuxième triangle
            indices.push(b, c, d);
        }
    }
    
    // Créer la géométrie avec les sommets et indices
    islandGeometry.setIndex(indices);
    islandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    islandGeometry.computeVertexNormals();
    
    // Matériau pour l'île - vert pour l'herbe
    const islandMaterial = new THREE.MeshStandardMaterial({
        color: 0x8BC34A, // Vert clair
        flatShading: true, // Activer le flat shading pour un look low poly
        roughness: 0.8,
        metalness: 0.1
    });
    
    const island = new THREE.Mesh(islandGeometry, islandMaterial);
    island.castShadow = true;
    island.receiveShadow = true;
    scene.add(island);
    
    // Ajouter des plages autour de l'île
    addBeaches(scene, island, islandSize);
    
    return island;
}

/**
 * Ajoute des plages autour de l'île
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {THREE.Mesh} island - Le mesh de l'île
 * @param {number} islandSize - La taille de l'île
 */
function addBeaches(scene, island, islandSize) {
    // Créer un anneau autour de l'île pour les plages
    const beachGeometry = new THREE.BufferGeometry();
    const resolution = 40;
    const beachWidth = islandSize * 0.1;
    
    const vertices = [];
    const indices = [];
    
    // Générer les sommets
    for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
            // Position normalisée entre -0.5 et 0.5
            const nx = x / (resolution - 1) - 0.5;
            const nz = z / (resolution - 1) - 0.5;
            
            // Calculer la distance au centre
            const distToCenter = Math.sqrt(nx * nx + nz * nz) * 2;
            
            // Hauteur de la plage
            let height = 0;
            
            // Créer la plage seulement dans un anneau autour de l'île
            if (distToCenter >= 0.8 && distToCenter < 0.9) {
                // La plage descend progressivement vers l'eau
                height = Math.max(0, 5 * (1 - (distToCenter - 0.8) / 0.1));
            }
            
            // Ajouter le sommet
            vertices.push(nx * (islandSize + beachWidth), height, nz * (islandSize + beachWidth));
        }
    }
    
    // Générer les triangles
    for (let z = 0; z < resolution - 1; z++) {
        for (let x = 0; x < resolution - 1; x++) {
            const a = z * resolution + x;
            const b = z * resolution + x + 1;
            const c = (z + 1) * resolution + x;
            const d = (z + 1) * resolution + x + 1;
            
            // Premier triangle
            indices.push(a, c, b);
            
            // Deuxième triangle
            indices.push(b, c, d);
        }
    }
    
    // Créer la géométrie avec les sommets et indices
    beachGeometry.setIndex(indices);
    beachGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    beachGeometry.computeVertexNormals();
    
    // Matériau pour la plage - couleur sable
    const beachMaterial = new THREE.MeshStandardMaterial({
        color: 0xE6D2A8, // Couleur sable
        flatShading: true,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const beach = new THREE.Mesh(beachGeometry, beachMaterial);
    beach.castShadow = true;
    beach.receiveShadow = true;
    scene.add(beach);
}

/**
 * Crée l'océan autour de l'île
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {number} terrainSize - La taille du terrain
 * @returns {THREE.Mesh} Le mesh de l'océan
 */
function createOcean(scene, terrainSize) {
    const oceanGeometry = new THREE.PlaneGeometry(terrainSize * 2, terrainSize * 2, 32, 32);
    
    // Matériau pour l'océan - bleu
    const oceanMaterial = new THREE.MeshStandardMaterial({
        color: 0x4FC3F7, // Bleu clair
        flatShading: true,
        roughness: 0.3,
        metalness: 0.6
    });
    
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -2; // Légèrement en dessous de l'île
    ocean.receiveShadow = true;
    scene.add(ocean);
    
    return ocean;
}

/**
 * Crée les montagnes
 * @param {THREE.Scene} scene - La scène Three.js
 * @returns {THREE.Group} Le groupe contenant les montagnes
 */
function createMountains(scene) {
    const mountainsGroup = new THREE.Group();
    
    // Créer plusieurs montagnes
    const mountainCount = 8;
    const mountainPositions = [
        { x: -300, z: -100, scale: 1.5, color: 0xA1887F }, // Marron
        { x: -250, z: -150, scale: 1.2, color: 0x8D6E63 }, // Marron plus foncé
        { x: -350, z: -50, scale: 1.3, color: 0xA1887F },
        { x: -200, z: -100, scale: 1.0, color: 0x8D6E63 },
        { x: -280, z: -200, scale: 1.4, color: 0xA1887F },
        { x: -320, z: 0, scale: 1.1, color: 0x8D6E63 },
        { x: -400, z: -120, scale: 1.6, color: 0xA1887F }, // Grande montagne
        { x: -150, z: -50, scale: 0.9, color: 0x8D6E63 }
    ];
    
    // Créer chaque montagne
    for (const pos of mountainPositions) {
        const mountain = createLowPolyMountain(pos.color);
        mountain.position.set(pos.x, 0, pos.z);
        mountain.scale.set(pos.scale * 100, pos.scale * 150, pos.scale * 100);
        mountainsGroup.add(mountain);
    }
    
    scene.add(mountainsGroup);
    return mountainsGroup;
}

/**
 * Crée une montagne low poly
 * @param {number} color - La couleur de la montagne
 * @returns {THREE.Mesh} Le mesh de la montagne
 */
function createLowPolyMountain(color) {
    // Créer une géométrie de tétraèdre modifiée pour une montagne low poly
    const geometry = new THREE.ConeGeometry(1, 1, 4, 1);
    
    // Déformer légèrement les sommets pour un aspect plus naturel
    const positions = geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += (Math.random() - 0.5) * 0.2;
        positions[i + 2] += (Math.random() - 0.5) * 0.2;
    }
    
    geometry.computeVertexNormals();
    
    // Matériau pour la montagne
    const material = new THREE.MeshStandardMaterial({
        color: color,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.2
    });
    
    return new THREE.Mesh(geometry, material);
}

/**
 * Crée une petite ville low poly
 * @param {THREE.Scene} scene - La scène Three.js
 */
function createLowPolyCity(scene) {
    const cityGroup = new THREE.Group();
    cityGroup.position.set(200, 0, 200); // Position de la ville sur l'île
    
    // Créer plusieurs bâtiments
    const buildingCount = 30;
    
    for (let i = 0; i < buildingCount; i++) {
        // Position aléatoire dans un cercle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 50;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        // Taille aléatoire
        const width = 3 + Math.random() * 5;
        const height = 5 + Math.random() * 15;
        const depth = 3 + Math.random() * 5;
        
        // Créer un bâtiment
        const building = createLowPolyBuilding(width, height, depth);
        building.position.set(x, height / 2, z);
        
        // Rotation aléatoire
        building.rotation.y = Math.random() * Math.PI * 2;
        
        cityGroup.add(building);
    }
    
    scene.add(cityGroup);
}

/**
 * Crée un bâtiment low poly
 * @param {number} width - La largeur du bâtiment
 * @param {number} height - La hauteur du bâtiment
 * @param {number} depth - La profondeur du bâtiment
 * @returns {THREE.Mesh} Le mesh du bâtiment
 */
function createLowPolyBuilding(width, height, depth) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    
    // Couleur aléatoire pour le bâtiment
    const colors = [
        0xE0E0E0, // Gris clair
        0xBDBDBD, // Gris
        0x9E9E9E, // Gris foncé
        0x757575  // Gris très foncé
    ];
    
    const material = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        flatShading: true,
        roughness: 0.7,
        metalness: 0.3
    });
    
    return new THREE.Mesh(geometry, material);
}

/**
 * Crée des forêts sur l'île
 * @param {THREE.Scene} scene - La scène Three.js
 */
function createForests(scene) {
    const forestsGroup = new THREE.Group();
    
    // Créer plusieurs zones de forêt
    const forestCount = 5;
    const forestPositions = [
        { x: 100, z: -100, radius: 80 },
        { x: -100, z: 100, radius: 60 },
        { x: 0, z: 200, radius: 70 },
        { x: 150, z: 50, radius: 50 },
        { x: -50, z: -150, radius: 40 }
    ];
    
    // Créer chaque forêt
    for (const pos of forestPositions) {
        const forest = createForestCluster(pos.radius);
        forest.position.set(pos.x, 0, pos.z);
        forestsGroup.add(forest);
    }
    
    scene.add(forestsGroup);
}

/**
 * Crée un groupe d'arbres formant une forêt
 * @param {number} radius - Le rayon de la forêt
 * @returns {THREE.Group} Le groupe contenant les arbres
 */
function createForestCluster(radius) {
    const forestGroup = new THREE.Group();
    
    // Nombre d'arbres basé sur le rayon
    const treeCount = Math.floor(radius * 0.5);
    
    for (let i = 0; i < treeCount; i++) {
        // Position aléatoire dans un cercle
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * radius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        
        // Taille aléatoire
        const scale = 0.5 + Math.random() * 1.5;
        
        // Créer un arbre
        const tree = createLowPolyTree();
        tree.position.set(x, 0, z);
        tree.scale.set(scale, scale, scale);
        
        // Rotation aléatoire
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        forestGroup.add(tree);
    }
    
    return forestGroup;
}

/**
 * Crée un arbre low poly
 * @returns {THREE.Group} Le groupe contenant l'arbre
 */
function createLowPolyTree() {
    const treeGroup = new THREE.Group();
    
    // Tronc
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 4, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8D6E63, // Marron
        flatShading: true,
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    treeGroup.add(trunk);
    
    // Feuillage
    const foliageGeometry = new THREE.ConeGeometry(2, 6, 6);
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50, // Vert
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
    });
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
    foliage.position.y = 6;
    treeGroup.add(foliage);
    
    return treeGroup;
}

/**
 * Ajoute des nuages low poly à la scène
 * @param {THREE.Scene} scene - La scène Three.js
 */
function addLowPolyClouds(scene) {
    // Groupe pour contenir tous les nuages
    const cloudsGroup = new THREE.Group();
    cloudsGroup.position.y = 300; // Hauteur des nuages
    scene.add(cloudsGroup);
    
    // Créer plusieurs nuages
    for (let i = 0; i < 15; i++) {
        // Position aléatoire
        const x = (Math.random() - 0.5) * 2000;
        const y = Math.random() * 100;
        const z = (Math.random() - 0.5) * 2000;
        
        // Taille aléatoire
        const scale = 30 + Math.random() * 70;
        
        // Créer un nuage
        const cloud = createLowPolyCloud();
        cloud.position.set(x, y, z);
        cloud.scale.set(scale, scale * 0.6, scale);
        
        // Rotation aléatoire
        cloud.rotation.y = Math.random() * Math.PI * 2;
        
        // Ajouter au groupe
        cloudsGroup.add(cloud);
    }
}

/**
 * Crée un nuage low poly
 * @returns {THREE.Group} Le groupe contenant le nuage
 */
function createLowPolyCloud() {
    const cloudGroup = new THREE.Group();
    
    // Matériau pour le nuage
    const cloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        flatShading: true,
        roughness: 0.8,
        metalness: 0.1
    });
    
    // Nombre de "blobs" pour former le nuage
    const blobCount = 3 + Math.floor(Math.random() * 4);
    
    // Créer plusieurs formes géométriques pour former le nuage
    for (let i = 0; i < blobCount; i++) {
        // Position aléatoire autour du centre
        const x = (Math.random() - 0.5) * 2;
        const y = (Math.random() - 0.5) * 0.5;
        const z = (Math.random() - 0.5) * 2;
        
        // Taille aléatoire
        const size = 0.7 + Math.random() * 0.5;
        
        // Utiliser un icosaèdre pour un look low poly
        const geometry = new THREE.IcosahedronGeometry(size, 0); // 0 = pas de subdivisions pour un look très low poly
        const blob = new THREE.Mesh(geometry, cloudMaterial);
        
        blob.position.set(x, y, z);
        cloudGroup.add(blob);
    }
    
    return cloudGroup;
}

/**
 * Génère une carte de hauteur aléatoire
 * @param {number} width - La largeur de la carte
 * @param {number} height - La hauteur de la carte
 * @returns {Array} La carte de hauteur
 */
function generateHeightMap(width, height) {
    const map = [];
    
    // Initialiser la carte avec des valeurs aléatoires
    for (let z = 0; z < height; z++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push(Math.random());
        }
        map.push(row);
    }
    
    // Lisser la carte
    const smoothedMap = [];
    for (let z = 0; z < height; z++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            // Moyenne des valeurs voisines
            let sum = 0;
            let count = 0;
            
            for (let dz = -1; dz <= 1; dz++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nz = z + dz;
                    const nx = x + dx;
                    
                    if (nz >= 0 && nz < height && nx >= 0 && nx < width) {
                        sum += map[nz][nx];
                        count++;
                    }
                }
            }
            
            row.push(sum / count);
        }
        smoothedMap.push(row);
    }
    
    return smoothedMap;
}

/**
 * Calcule la hauteur du terrain à une position donnée
 * @param {number} x - Coordonnée X
 * @param {number} z - Coordonnée Z
 * @returns {number} La hauteur du terrain
 */
export function getTerrainHeightAtPosition(x, z) {
    // Calculer la distance au centre de l'île
    const distToCenter = Math.sqrt(x * x + z * z);
    const islandRadius = 1000; // Rayon approximatif de l'île
    
    // Si on est sur l'île
    if (distToCenter < islandRadius) {
        // Hauteur de base de l'île
        const baseHeight = Math.max(0, 20 * (1 - distToCenter / islandRadius));
        
        // Vérifier si on est dans la zone des montagnes
        const mountainsX = -300;
        const mountainsZ = -100;
        const mountainsRadius = 400;
        
        const distToMountains = Math.sqrt((x - mountainsX) * (x - mountainsX) + (z - mountainsZ) * (z - mountainsZ));
        
        if (distToMountains < mountainsRadius) {
            // Hauteur supplémentaire pour les montagnes
            const mountainHeight = Math.max(0, 100 * (1 - distToMountains / mountainsRadius));
            return baseHeight + mountainHeight;
        }
        
        return baseHeight;
    }
    
    // Si on est dans l'eau
    return 0;
}

/**
 * Crée une grille pour mieux percevoir l'altitude
 * @param {THREE.Scene} scene - La scène Three.js
 */
export function createGrid(scene) {
    // La grille a été supprimée pour un rendu plus naturel
    // Aucune grille n'est visible dans l'image de référence
} 