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
        const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, 100, 100); // Moins de subdivisions pour un look low poly plus prononcé
        
        // Ajout de relief au terrain avec des montagnes et collines plus variées
        const vertices = geometry.attributes.position.array;
        
        // Fonction pour générer du bruit Perlin simplifié
        const perlin = (x, z, scale, amplitude) => {
            const noiseScale = scale;
            return amplitude * Math.sin(x / noiseScale) * Math.cos(z / noiseScale);
        };
        
        // Définir des montagnes spécifiques à des positions précises
        const specificMountains = [
            // Grande chaîne de montagnes centrale
            { x: 0, z: -500, radius: 800, height: 250, type: 'range', color: 0xA05B53 }, // Montagnes brunes/orangées
            
            // Pic principal
            { x: 200, z: -300, radius: 400, height: 350, type: 'peak', color: 0xB06B43 }, // Plus haut et plus orangé
            
            // Montagnes secondaires
            { x: -800, z: 600, radius: 500, height: 220, type: 'peak', color: 0x9D5B33 },
            { x: 1000, z: 800, radius: 600, height: 280, type: 'peak', color: 0xA05B53 },
            
            // Petite chaîne à l'est
            { x: 1500, z: -200, radius: 700, height: 200, type: 'range', color: 0xB06B43 },
            
            // Montagnes isolées
            { x: -1200, z: -900, radius: 300, height: 180, type: 'peak', color: 0x9D5B33 },
            { x: 700, z: 1200, radius: 350, height: 190, type: 'peak', color: 0xA05B53 },
            
            // Montagne proche du point de départ
            { x: 0, z: 0, radius: 600, height: 150, type: 'peak', color: 0x9D5B33 },
            
            // Nouvelles montagnes plus hautes et plus anguleuses
            { x: -400, z: -700, radius: 350, height: 320, type: 'peak', color: 0xB06B43 },
            { x: 600, z: -500, radius: 300, height: 280, type: 'peak', color: 0xA05B53 },
            { x: -600, z: 300, radius: 400, height: 250, type: 'peak', color: 0x9D5B33 },
            { x: 300, z: 600, radius: 350, height: 230, type: 'peak', color: 0xB06B43 },
        ];
        
        // Fonction pour calculer la hauteur d'une montagne à une position donnée
        const calculateMountainHeight = (x, z, mountain) => {
            const dx = x - mountain.x;
            const dz = z - mountain.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance >= mountain.radius) return 0;
            
            let heightFactor;
            
            if (mountain.type === 'peak') {
                // Montagne conique avec sommet plus pointu pour un look low poly
                heightFactor = Math.pow(1 - distance / mountain.radius, 1.2); // Exposant plus petit pour des pentes plus raides
                
                // Ajouter des facettes plus prononcées au sommet
                if (distance < mountain.radius * 0.2) {
                    // Utiliser des fonctions step pour créer des plateaux et des arêtes
                    const step = Math.floor(distance / (mountain.radius * 0.05)) * (mountain.radius * 0.05);
                    heightFactor += 0.4 * Math.pow(1 - step / (mountain.radius * 0.2), 2);
                }
            } else if (mountain.type === 'range') {
                // Chaîne de montagnes avec crête plus anguleuse
                // Calculer la distance à la ligne centrale de la chaîne
                const angle = Math.atan2(dz, dx);
                const distanceToRidge = Math.abs(distance * Math.sin(angle));
                
                // La hauteur diminue en s'éloignant de la crête avec des plateaux
                heightFactor = Math.pow(1 - distanceToRidge / (mountain.radius * 0.5), 1.0); // Exposant plus petit pour des pentes plus raides
                
                // Variation le long de la crête avec des arêtes plus prononcées
                const positionOnRidge = distance * Math.cos(angle);
                const ridgeVariation = 0.4 * Math.sin(positionOnRidge / 200) + 0.3 * Math.sin(positionOnRidge / 50);
                
                heightFactor = Math.max(0, heightFactor) * (1 + ridgeVariation);
                
                // Ajouter des facettes en "escalier" pour un look plus low poly
                heightFactor = Math.floor(heightFactor * 5) / 5;
            }
            
            return mountain.height * heightFactor;
        };
        
        // Créer un tableau pour stocker les matériaux des montagnes
        const mountainMaterials = [];
        const mountainGeometries = [];
        const mountainMeshes = [];
        
        // Appliquer les hauteurs au terrain
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Hauteur de base avec du bruit Perlin
            let height = 
                perlin(x, z, 150, 15) + 
                perlin(x, z, 75, 8) + 
                perlin(x, z, 30, 4);
            
            // Ajouter les montagnes spécifiques
            for (const mountain of specificMountains) {
                height += calculateMountainHeight(x, z, mountain);
            }
            
            // Ajouter des détails de texture aux montagnes
            if (height > 50) {
                height += perlin(x, z, 10, 2) + perlin(x, z, 5, 1);
            }
            
            // Discrétiser la hauteur pour créer des plateaux (effet low poly)
            const stepSize = 5; // Taille des marches
            height = Math.floor(height / stepSize) * stepSize;
            
            // Appliquer la hauteur
            vertices[i + 1] = height;
        }
        
        geometry.computeVertexNormals();
        
        // Matériau du terrain avec texture - style low poly plus prononcé
        const material = new THREE.MeshStandardMaterial({
            color: 0x7cba3d, // Vert plus vif
            side: THREE.DoubleSide,
            flatShading: true, // Activer le flat shading pour un look low poly
            roughness: 0.8,
            metalness: 0.1,
            wireframe: false
        });
        
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        scene.add(terrain);
        
        // Créer des montagnes séparées avec des matériaux distincts
        for (const mountain of specificMountains) {
            createMountain(scene, mountain);
        }
        
        // Ajout d'un plan d'eau sous le terrain
        const waterGeometry = new THREE.PlaneGeometry(terrainSize * 1.5, terrainSize * 1.5);
        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a9ad9, // Bleu vif pour l'eau
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.3,
            metalness: 0.6
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -10; // Légèrement en dessous du terrain
        water.receiveShadow = true;
        scene.add(water);
        
        // Ajout d'un sol terreux sous les parties émergées
        const groundGeometry = new THREE.PlaneGeometry(terrainSize * 1.5, terrainSize * 1.5);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0xd9c27e, // Couleur sable/terre
            side: THREE.DoubleSide,
            flatShading: true,
            roughness: 0.9,
            metalness: 0.1
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -5; // Entre l'eau et le terrain
        ground.receiveShadow = true;
        scene.add(ground);
        
        // Ajout de forêts
        addForests(scene, terrain, specificMountains, terrainSize);
        
        // Ajout de nuages low poly
        addLowPolyClouds(scene);
        
        return terrain;
    } catch (error) {
        console.error('Erreur lors de la création du terrain:', error);
        return null;
    }
}

/**
 * Crée une montagne avec un matériau spécifique
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {Object} mountain - Les paramètres de la montagne
 */
function createMountain(scene, mountain) {
    // Créer une géométrie conique pour la montagne
    let geometry;
    
    if (mountain.type === 'peak') {
        // Pour les pics, utiliser un cône avec peu de segments
        geometry = new THREE.ConeGeometry(mountain.radius, mountain.height, 6);
    } else {
        // Pour les chaînes, utiliser une géométrie plus complexe
        geometry = new THREE.CylinderGeometry(0, mountain.radius, mountain.height, 6, 2);
        // Déformer la géométrie pour créer une crête
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            // Aplatir le sommet pour créer une crête
            if (vertices[i + 1] > mountain.height * 0.7) {
                vertices[i + 1] = mountain.height * 0.7 + (vertices[i + 1] - mountain.height * 0.7) * 0.5;
            }
            // Ajouter des variations pour un aspect plus naturel
            vertices[i] += Math.sin(z * 0.2) * mountain.radius * 0.2;
            vertices[i + 2] += Math.sin(x * 0.2) * mountain.radius * 0.2;
        }
        geometry.computeVertexNormals();
    }
    
    // Matériau avec la couleur spécifique de la montagne
    const material = new THREE.MeshStandardMaterial({
        color: mountain.color || 0xA05B53, // Couleur par défaut si non spécifiée
        flatShading: true,
        roughness: 0.9,
        metalness: 0.1
    });
    
    const mountainMesh = new THREE.Mesh(geometry, material);
    mountainMesh.position.set(mountain.x, mountain.height / 2, mountain.z);
    mountainMesh.castShadow = true;
    mountainMesh.receiveShadow = true;
    
    // Rotation aléatoire pour plus de variété
    mountainMesh.rotation.y = Math.random() * Math.PI * 2;
    
    scene.add(mountainMesh);
}

/**
 * Ajoute des nuages low poly à la scène
 * @param {THREE.Scene} scene - La scène Three.js
 */
function addLowPolyClouds(scene) {
    // Groupe pour contenir tous les nuages
    const cloudsGroup = new THREE.Group();
    cloudsGroup.position.y = 500; // Hauteur des nuages
    scene.add(cloudsGroup);
    
    // Créer plusieurs nuages
    for (let i = 0; i < 15; i++) {
        // Position aléatoire
        const x = (Math.random() - 0.5) * 3000;
        const y = Math.random() * 200;
        const z = (Math.random() - 0.5) * 3000;
        
        // Taille aléatoire
        const scale = 50 + Math.random() * 100;
        
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
 * Ajoute des forêts au terrain
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {THREE.Mesh} terrain - Le mesh du terrain
 * @param {Array} mountainZones - Les zones de montagnes
 * @param {number} terrainSize - La taille du terrain
 */
function addForests(scene, terrain, mountainZones, terrainSize) {
    // Créer des groupes d'arbres dans différentes zones
    const forestZones = [];
    
    // Forêts dans les zones de montagnes
    for (const mountain of mountainZones) {
        if (Math.random() > 0.3) { // 70% de chance d'avoir une forêt sur une montagne
            forestZones.push({
                x: mountain.x,
                z: mountain.z,
                radius: mountain.radius * 0.7,
                density: 0.1 + Math.random() * 0.2
            });
        }
    }
    
    // Quelques forêts aléatoires supplémentaires
    for (let i = 0; i < 10; i++) {
        forestZones.push({
            x: (Math.random() - 0.5) * terrainSize * 0.8,
            z: (Math.random() - 0.5) * terrainSize * 0.8,
            radius: 50 + Math.random() * 150,
            density: 0.05 + Math.random() * 0.15
        });
    }
    
    // Créer des instances d'arbres pour chaque zone de forêt
    for (const forest of forestZones) {
        createForest(scene, forest, terrain);
    }
}

/**
 * Crée une forêt dans une zone spécifique
 * @param {THREE.Scene} scene - La scène Three.js
 * @param {Object} forest - Les paramètres de la forêt
 * @param {THREE.Mesh} terrain - Le mesh du terrain
 */
function createForest(scene, forest, terrain) {
    // Nombre d'arbres basé sur la densité et la taille de la forêt
    const treeCount = Math.floor(forest.radius * forest.radius * forest.density * 0.01);
    
    // Limiter le nombre d'arbres pour des raisons de performance
    const maxTrees = 100;
    const actualTreeCount = Math.min(treeCount, maxTrees);
    
    // Créer un groupe pour contenir tous les arbres de cette forêt
    const forestGroup = new THREE.Group();
    scene.add(forestGroup);
    
    // Créer des géométries d'arbres réutilisables
    const treeTypes = [
        createPineTree(),
        createBroadleafTree()
    ];
    
    // Tableau pour stocker les positions des arbres déjà placés
    const placedTrees = [];
    
    // Placer les arbres
    for (let i = 0; i < actualTreeCount; i++) {
        // Position aléatoire dans la zone de forêt
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * forest.radius;
        const x = forest.x + Math.cos(angle) * distance;
        const z = forest.z + Math.sin(angle) * distance;
        
        // Déterminer la hauteur du terrain à cette position
        const y = getApproximateHeight(x, z, terrain);
        
        // Choisir un type d'arbre aléatoire
        const treeType = treeTypes[Math.floor(Math.random() * treeTypes.length)];
        const tree = treeType.clone();
        
        // Taille aléatoire
        const scale = 0.8 + Math.random() * 0.4;
        tree.scale.set(scale, scale, scale);
        
        // Rotation aléatoire
        tree.rotation.y = Math.random() * Math.PI * 2;
        
        // Vérifier si l'arbre est proche d'un autre arbre
        let finalY = y;
        let touchingAnotherTree = false;
        
        // Rayon approximatif de l'arbre (pour la détection de proximité)
        const treeRadius = 3 * scale;
        
        // Vérifier la proximité avec les arbres déjà placés
        for (const placedTree of placedTrees) {
            const dx = x - placedTree.x;
            const dz = z - placedTree.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Si l'arbre est très proche d'un autre (mais pas trop pour éviter les chevauchements complets)
            if (distance < treeRadius * 1.5 && distance > treeRadius * 0.5) {
                touchingAnotherTree = true;
                
                // Ajuster la hauteur pour qu'il semble "pousser" contre l'autre arbre
                // On utilise la hauteur de l'arbre déjà placé comme référence
                finalY = placedTree.y;
                
                // Légère variation pour éviter que tous les arbres soient exactement à la même hauteur
                finalY += (Math.random() - 0.5) * 2;
                break;
            }
        }
        
        // Si l'arbre ne touche pas un autre arbre, il touche le sol
        if (!touchingAnotherTree) {
            // Assurer que l'arbre est exactement au niveau du sol
            finalY = y;
        }
        
        // Positionner l'arbre
        tree.position.set(x, finalY, z);
        
        // Enregistrer la position de cet arbre
        placedTrees.push({
            x: x,
            y: finalY,
            z: z,
            radius: treeRadius
        });
        
        // Ajouter l'arbre au groupe de forêt
        forestGroup.add(tree);
    }
}

/**
 * Obtient une hauteur approximative du terrain à une position donnée
 * @param {number} x - Coordonnée X
 * @param {number} z - Coordonnée Z
 * @param {THREE.Mesh} terrain - Le mesh du terrain
 * @returns {number} La hauteur approximative
 */
function getApproximateHeight(x, z, terrain) {
    // Fonction simplifiée pour estimer la hauteur
    // Dans un cas réel, on utiliserait un raycasting précis
    
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
 * Crée un modèle d'arbre de type pin - style low poly
 * @returns {THREE.Group} Le groupe contenant l'arbre
 */
function createPineTree() {
    const treeGroup = new THREE.Group();
    
    // Tronc
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 5); // Encore moins de segments pour un look plus low poly
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        flatShading: true, // Activer le flat shading pour un look low poly
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Feuillage (plusieurs cônes superposés)
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x2d6a1e, // Vert plus vif
        flatShading: true, // Activer le flat shading pour un look low poly
        roughness: 0.8,
        metalness: 0.1
    });
    
    const foliage1 = new THREE.Mesh(
        new THREE.ConeGeometry(3, 6, 5), // Moins de segments pour un look plus low poly
        foliageMaterial
    );
    foliage1.position.y = 5;
    foliage1.castShadow = true;
    treeGroup.add(foliage1);
    
    const foliage2 = new THREE.Mesh(
        new THREE.ConeGeometry(2.5, 5, 5), // Moins de segments pour un look plus low poly
        foliageMaterial
    );
    foliage2.position.y = 8;
    foliage2.castShadow = true;
    treeGroup.add(foliage2);
    
    const foliage3 = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 4, 5), // Moins de segments pour un look plus low poly
        foliageMaterial
    );
    foliage3.position.y = 10.5;
    foliage3.castShadow = true;
    treeGroup.add(foliage3);
    
    return treeGroup;
}

/**
 * Crée un modèle d'arbre à feuilles larges - style low poly
 * @returns {THREE.Group} Le groupe contenant l'arbre
 */
function createBroadleafTree() {
    const treeGroup = new THREE.Group();
    
    // Tronc
    const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.6, 4, 5); // Moins de segments pour un look plus low poly
    const trunkMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        flatShading: true, // Activer le flat shading pour un look low poly
        roughness: 0.9,
        metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);
    
    // Feuillage (forme géométrique simple)
    const foliageMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a9d44, // Vert plus vif
        flatShading: true, // Activer le flat shading pour un look low poly
        roughness: 0.8,
        metalness: 0.1
    });
    
    const foliage = new THREE.Mesh(
        new THREE.IcosahedronGeometry(3, 0), // Utiliser un icosaèdre sans subdivision pour un look très low poly
        foliageMaterial
    );
    foliage.position.y = 6;
    foliage.scale.y = 1.2;
    foliage.castShadow = true;
    treeGroup.add(foliage);
    
    return treeGroup;
}

/**
 * Crée une grille pour mieux percevoir l'altitude
 * @param {THREE.Scene} scene - La scène Three.js
 */
export function createGrid(scene) {
    // La grille a été supprimée pour un rendu plus naturel
    // Aucune grille n'est visible dans l'image de référence
} 