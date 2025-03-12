import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTerrain, createGrid } from './terrain.js';
import { Deltaplane } from './deltaplane.js';

// Variables globales
let camera, scene, renderer;
let controls;
let deltaplane;
let terrain;
let clock = new THREE.Clock();
let devMode = false; // Mode développement désactivé

// Débogage
console.log('Initialisation du simulateur de deltaplane...');

// Initialisation
init();
animate();

function init() {
    console.log('Fonction init() appelée');
    
    try {
        // Création de la scène
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Bleu ciel plus vif pour le style low poly
        console.log('Scène créée');

        // Création de la caméra
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(0, 100, 200); // Position originale
        console.log('Caméra créée');

        // Création du renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true; // Activer les ombres
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombres douces
        document.body.appendChild(renderer.domElement);
        console.log('Renderer créé et ajouté au DOM');

        // Ajout des contrôles pour le développement
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 500;
        controls.maxPolarAngle = Math.PI / 2;
        controls.enabled = devMode; // Désactivé par défaut
        console.log('Contrôles créés');

        // Création du terrain
        terrain = createTerrain(scene);
        console.log('Terrain créé');
        
        // Ajout d'une grille de référence
        createGrid(scene);
        console.log('Grille créée');

        // Création du deltaplane
        deltaplane = new Deltaplane(scene);
        console.log('Deltaplane créé');
        
        // Passer la référence du terrain au deltaplane pour la détection de collisions
        deltaplane.setTerrain(terrain);
        console.log('Référence du terrain passée au deltaplane');

        // Ajout des lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Lumière ambiante plus douce
        scene.add(ambientLight);
        console.log('Lumière ambiante ajoutée');

        // Lumière directionnelle (soleil)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Plus intense pour des ombres plus marquées
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // Configuration des ombres
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        
        scene.add(directionalLight);
        console.log('Lumière directionnelle ajoutée');
        
        // Lumière secondaire pour éclairer les zones d'ombre
        const secondaryLight = new THREE.DirectionalLight(0x6666ff, 0.3); // Lumière bleutée
        secondaryLight.position.set(-50, 30, -50);
        scene.add(secondaryLight);
        console.log('Lumière secondaire ajoutée');

        // Gestion du redimensionnement de la fenêtre
        window.addEventListener('resize', onWindowResize);
        console.log('Gestionnaire de redimensionnement ajouté');

        // Gestion des touches du clavier
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        console.log('Gestionnaires de clavier ajoutés');

        // Élément de débogage
        const debugElement = document.createElement('div');
        debugElement.id = 'debug';
        debugElement.style.position = 'absolute';
        debugElement.style.top = '10px';
        debugElement.style.left = '10px';
        debugElement.style.color = 'white';
        debugElement.style.fontFamily = 'monospace';
        debugElement.style.fontSize = '12px';
        debugElement.style.textShadow = '1px 1px 1px black';
        debugElement.style.pointerEvents = 'none'; // Ne pas interférer avec les clics
        document.body.appendChild(debugElement);
        console.log('Élément de débogage ajouté');

        // Instructions
        const instructionsElement = document.createElement('div');
        instructionsElement.id = 'instructions';
        instructionsElement.style.position = 'absolute';
        instructionsElement.style.bottom = '10px';
        instructionsElement.style.left = '10px';
        instructionsElement.style.color = 'white';
        instructionsElement.style.fontFamily = 'Arial, sans-serif';
        instructionsElement.style.fontSize = '14px';
        instructionsElement.style.textShadow = '1px 1px 1px black';
        instructionsElement.style.pointerEvents = 'none';
        instructionsElement.innerHTML = `
            <div style="background-color: rgba(0, 0, 0, 0.5); padding: 10px; border-radius: 5px;">
                <h3 style="margin-top: 0;">Contrôles du deltaplane:</h3>
                <p>Flèches directionnelles: contrôler l'orientation du deltaplane</p>
                <p>↑/↓: Cabrer/Piquer (monter/descendre)</p>
                <p>←/→: Incliner à gauche/droite (tourner)</p>
            </div>
        `;
        document.body.appendChild(instructionsElement);
        console.log('Instructions ajoutées');

        // Positionnement initial du deltaplane
        deltaplane.mesh.position.set(0, 100, 0);
        console.log('Deltaplane positionné');
        
        // Initialisation de la caméra pour suivre le deltaplane
        deltaplane.updateCamera(camera);
        console.log('Caméra initialisée pour suivre le deltaplane');
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

function resetPosition() {
    // Réinitialiser la position et la vitesse du deltaplane
    deltaplane.resetPosition();
    
    // Afficher un message
    const debugElement = document.getElementById('debug');
    if (debugElement) {
        debugElement.innerHTML += `<div>Position réinitialisée</div>`;
    }
}

function onWindowResize() {
    try {
        // Mise à jour de la caméra et du renderer lors du redimensionnement
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    } catch (error) {
        console.error('Erreur lors du redimensionnement de la fenêtre:', error);
    }
}

function onKeyDown(event) {
    // Afficher le code de la touche pour le débogage
    console.log('Touche pressée:', event.code);
    
    // Réinitialiser la position avec la touche R
    if (event.code === 'KeyR') {
        resetPosition();
        return;
    }
    
    // Ne pas traiter les autres touches en mode développement
    if (devMode) return;
    
    // Mise à jour des contrôles du deltaplane (uniquement orientation de la voile)
    // Simplification pour n'utiliser que les touches fléchées
    switch (event.code) {
        case 'ArrowUp':
            deltaplane.setControl('pitchDown', true); // Piquer vers l'avant
            console.log('Piquer vers l\'avant activé');
            break;
        case 'ArrowDown':
            deltaplane.setControl('pitchUp', true); // Cabrer
            console.log('Cabrer activé');
            break;
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', true); // Incliner à gauche
            console.log('Incliner à gauche activé');
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', true); // Incliner à droite
            console.log('Incliner à droite activé');
            break;
    }
}

function onKeyUp(event) {
    // Ne pas traiter les touches en mode développement
    if (devMode) return;
    
    // Mise à jour des contrôles du deltaplane
    // Simplification pour n'utiliser que les touches fléchées
    switch (event.code) {
        case 'ArrowUp':
            deltaplane.setControl('pitchDown', false);
            console.log('Piquer vers l\'avant désactivé');
            break;
        case 'ArrowDown':
            deltaplane.setControl('pitchUp', false);
            console.log('Cabrer désactivé');
            break;
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', false);
            console.log('Incliner à gauche désactivé');
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', false);
            console.log('Incliner à droite désactivé');
            break;
    }
}

function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Récupération du temps écoulé
        const delta = clock.getDelta();
        
        // Mise à jour des contrôles de développement
        if (controls.enabled) {
            controls.update();
        } else {
            // Mise à jour du deltaplane
            const debugElement = document.getElementById('debug');
            deltaplane.update(delta, debugElement);
            
            // Mise à jour de la caméra pour suivre le deltaplane
            deltaplane.updateCamera(camera);
        }
        
        // Rendu de la scène
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Erreur lors de l\'animation:', error);
    }
} 