import * as THREE from 'three';

export class CloudSystem {
    constructor(scene) {
        this.scene = scene;
        this.clouds = new Map(); // Map pour stocker les nuages par chunk
        this.cloudsPerChunk = 15; // Nombre de nuages par chunk
        this.chunkSize = 2000; // Même taille que les chunks de terrain
        this.renderDistance = 2; // Même distance de rendu que le terrain
        this.bounds = {
            minY: 200,    // Plus bas pour les nuages bas
            maxY: 1000,   // Plus haut pour les nuages d'altitude
        };
        this.windSpeed = new THREE.Vector3(1.5, 0, 1.5);
        
        // Créer plusieurs matériaux pour différents types de nuages
        this.cloudMaterials = [
            new THREE.MeshPhongMaterial({
                color: 0xffffff,     // Blanc pur (cumulus)
                flatShading: true,
                transparent: true,
                opacity: 0.9,
                shininess: 0,
                emissive: 0x444444,
            }),
            new THREE.MeshPhongMaterial({
                color: 0xe0e0e0,     // Gris clair (altocumulus)
                flatShading: true,
                transparent: true,
                opacity: 0.85,
                shininess: 0,
                emissive: 0x333333,
            }),
            new THREE.MeshPhongMaterial({
                color: 0xc0c0c0,     // Gris moyen (stratocumulus)
                flatShading: true,
                transparent: true,
                opacity: 0.8,
                shininess: 0,
                emissive: 0x222222,
            }),
            new THREE.MeshPhongMaterial({
                color: 0xa0a0a0,     // Gris foncé (nimbostratus)
                flatShading: true,
                transparent: true,
                opacity: 0.75,
                shininess: 0,
                emissive: 0x111111,
            })
        ];
    }

    createCloudMesh() {
        const cloudGroup = new THREE.Group();
        
        // Taille très variable selon le type de nuage
        const cloudType = Math.floor(Math.random() * 4); // 4 types de nuages
        const baseSize = 20 + Math.random() * 60; // Taille de base entre 20 et 80
        
        // Le nombre de cubes dépend de la taille
        const cubeCount = 3 + Math.floor(Math.random() * (baseSize / 10));
        
        // Utiliser le matériau correspondant au type de nuage
        const material = this.cloudMaterials[cloudType];
        
        for (let i = 0; i < cubeCount; i++) {
            // Taille variable pour chaque partie du nuage
            const size = baseSize * (0.5 + Math.random() * 0.8);
            const geometry = new THREE.BoxGeometry(
                size * (0.8 + Math.random() * 0.4),
                size * (0.2 + Math.random() * 0.3), // Hauteur plus variable
                size * (0.8 + Math.random() * 0.4)
            );
            
            // Déformation plus prononcée pour les gros nuages
            const deformAmount = size / 20;
            const positions = geometry.attributes.position;
            for (let j = 0; j < positions.count; j++) {
                positions.setXYZ(
                    j,
                    positions.getX(j) + (Math.random() - 0.5) * deformAmount,
                    positions.getY(j) + (Math.random() - 0.5) * deformAmount * 0.5,
                    positions.getZ(j) + (Math.random() - 0.5) * deformAmount
                );
            }
            geometry.computeVertexNormals();
            
            const cube = new THREE.Mesh(geometry, material);
            
            // Position relative à la taille
            const spread = baseSize * 0.6;
            cube.position.set(
                (Math.random() - 0.5) * spread,
                (Math.random() - 0.5) * spread * 0.3,
                (Math.random() - 0.5) * spread
            );
            
            // Rotation aléatoire plus prononcée pour les petits nuages
            const rotationAmount = 0.1 * (80 - baseSize) / 60;
            cube.rotation.set(
                Math.random() * rotationAmount,
                Math.random() * Math.PI,
                Math.random() * rotationAmount
            );
            
            cloudGroup.add(cube);
        }
        
        // Rotation globale aléatoire
        cloudGroup.rotation.y = Math.random() * Math.PI;
        
        return cloudGroup;
    }

    getChunkKey(x, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        return `${chunkX},${chunkZ}`;
    }

    createCloudsForChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (this.clouds.has(chunkKey)) return;

        const cloudsInChunk = [];
        const chunkMinX = chunkX * this.chunkSize;
        const chunkMinZ = chunkZ * this.chunkSize;

        for (let i = 0; i < this.cloudsPerChunk; i++) {
            const cloud = this.createCloudMesh();
            
            // Position avec altitude variable selon le type de nuage
            const heightRange = this.bounds.maxY - this.bounds.minY;
            const baseHeight = this.bounds.minY + Math.random() * heightRange;
            // Les plus gros nuages sont généralement plus bas
            const cloudSize = cloud.children[0].geometry.parameters.width;
            const heightAdjustment = (cloudSize / 80) * heightRange * 0.3;
            
            cloud.position.set(
                chunkMinX + Math.random() * this.chunkSize,
                baseHeight - heightAdjustment,
                chunkMinZ + Math.random() * this.chunkSize
            );
            
            cloudsInChunk.push(cloud);
            this.scene.add(cloud);
        }

        this.clouds.set(chunkKey, cloudsInChunk);
    }

    removeChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const cloudsInChunk = this.clouds.get(chunkKey);
        if (cloudsInChunk) {
            for (const cloud of cloudsInChunk) {
                cloud.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        child.material.dispose();
                    }
                });
                this.scene.remove(cloud);
            }
            this.clouds.delete(chunkKey);
        }
    }

    update(delta, playerPosition) {
        if (!playerPosition) return;

        // Déterminer les chunks à charger/décharger
        const currentChunkX = Math.floor(playerPosition.x / this.chunkSize);
        const currentChunkZ = Math.floor(playerPosition.z / this.chunkSize);

        // Créer les chunks dans la zone de rendu
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const chunkX = currentChunkX + x;
                const chunkZ = currentChunkZ + z;
                this.createCloudsForChunk(chunkX, chunkZ);
            }
        }

        // Supprimer les chunks hors de la zone de rendu
        for (const [key, clouds] of this.clouds.entries()) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - currentChunkX) > this.renderDistance || 
                Math.abs(z - currentChunkZ) > this.renderDistance) {
                this.removeChunk(x, z);
            }
        }

        // Mettre à jour la position des nuages
        for (const clouds of this.clouds.values()) {
            for (const cloud of clouds) {
                cloud.position.add(this.windSpeed.clone().multiplyScalar(delta));
                cloud.rotation.y += delta * 0.1;

                // Repositionner les nuages qui sortent du chunk
                const chunkX = Math.floor(cloud.position.x / this.chunkSize);
                const chunkZ = Math.floor(cloud.position.z / this.chunkSize);
                const chunkKey = `${chunkX},${chunkZ}`;

                if (!this.clouds.has(chunkKey)) {
                    // Trouver le chunk d'origine
                    const originalChunkKey = Array.from(this.clouds.keys()).find(key => 
                        this.clouds.get(key).includes(cloud)
                    );
                    if (originalChunkKey) {
                        const [origX, origZ] = originalChunkKey.split(',').map(Number);
                        cloud.position.x = origX * this.chunkSize + (cloud.position.x % this.chunkSize + this.chunkSize) % this.chunkSize;
                        cloud.position.z = origZ * this.chunkSize + (cloud.position.z % this.chunkSize + this.chunkSize) % this.chunkSize;
                    }
                }
            }
        }
    }

    dispose() {
        for (const [key] of this.clouds.entries()) {
            const [x, z] = key.split(',').map(Number);
            this.removeChunk(x, z);
        }
        this.clouds.clear();
    }
} 