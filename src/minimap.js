import * as THREE from 'three';

export class Minimap {
    constructor(scene, camera, config) {
        this.container = document.getElementById('minimap-container');
        if (!this.container) {
            console.error('Minimap container not found!');
            return;
        }

        // Taille de la minimap
        this.size = 200;
        this.scale = 0.02; // 1 unité = 50 unités monde

        // Création de la caméra orthographique
        const aspect = 1; // La minimap est carrée
        const viewSize = 1000; // Taille de la vue en unités monde
        this.camera = new THREE.OrthographicCamera(
            -viewSize * aspect / 2,
            viewSize * aspect / 2,
            viewSize / 2,
            -viewSize / 2,
            1,
            1000
        );
        this.camera.position.set(0, 500, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 0, -1); // Orienter la caméra pour que le nord soit en haut

        // Création du renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.size, this.size);
        this.renderer.setClearColor(0x000000, 0.0);
        this.container.appendChild(this.renderer.domElement);

        // Création de la scène
        this.scene = new THREE.Scene();

        // Création du marqueur du joueur (point blanc)
        const playerGeometry = new THREE.CircleGeometry(5, 32);
        const playerMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            side: THREE.DoubleSide
        });
        this.playerMarker = new THREE.Mesh(playerGeometry, playerMaterial);
        this.playerMarker.rotation.x = -Math.PI / 2; // Orienter le cercle horizontalement
        this.scene.add(this.playerMarker);

        // Map pour stocker les marqueurs d'îles
        this.islandMarkers = new Map();

        // Ajouter une grille de référence
        const gridHelper = new THREE.GridHelper(1000, 10, 0x444444, 0x222222);
        gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(gridHelper);
    }

    addIsland(island, color = 0x00FF00) {
        // Création du marqueur d'île (petit triangle)
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 8,     // pointe du triangle
            -4, 0, -4,   // coin gauche
            4, 0, -4     // coin droit
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const material = new THREE.MeshBasicMaterial({ 
            color: color,
            side: THREE.DoubleSide
        });
        const marker = new THREE.Mesh(geometry, material);
        
        // Positionner le marqueur
        marker.position.set(island.x * this.scale, 0, island.z * this.scale);
        this.scene.add(marker);
        
        // Stocker le marqueur
        this.islandMarkers.set(island, marker);
    }

    removeIsland(island) {
        const marker = this.islandMarkers.get(island);
        if (marker) {
            this.scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
            this.islandMarkers.delete(island);
        }
    }

    updatePlayerPosition(position, rotation) {
        // Mettre à l'échelle la position du joueur
        const scaledX = position.x * this.scale;
        const scaledZ = position.z * this.scale;
        
        this.playerMarker.position.set(scaledX, 0, scaledZ);
        this.playerMarker.rotation.y = rotation.y;
        
        // Mettre à jour la position de la caméra pour suivre le joueur
        this.camera.position.set(scaledX, 500, scaledZ);
        this.camera.lookAt(scaledX, 0, scaledZ);
    }

    update() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        // Nettoyer les ressources
        this.islandMarkers.forEach((marker) => {
            this.scene.remove(marker);
            marker.geometry.dispose();
            marker.material.dispose();
        });
        this.islandMarkers.clear();

        if (this.playerMarker) {
            this.scene.remove(this.playerMarker);
            this.playerMarker.geometry.dispose();
            this.playerMarker.material.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
    }
} 