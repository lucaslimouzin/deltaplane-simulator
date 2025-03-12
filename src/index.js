import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createTerrain, createGrid } from './terrain.js';
import { Deltaplane } from './deltaplane.js';
import { MultiplayerManager } from './multiplayer.js';

// Variables globales
let camera, scene, renderer;
let controls;
let deltaplane;
let terrain;
let clock = new THREE.Clock();
let devMode = false; // Mode développement désactivé
let multiplayerManager; // Gestionnaire multijoueur
let isMultiplayerMode = false; // Mode multijoueur désactivé par défaut
let gameStarted = false; // Indique si le jeu a démarré

// Initialisation
init();

// Fonction pour démarrer le jeu après la connexion
async function startGame() {
    // Créer le gestionnaire multijoueur s'il n'existe pas déjà
    if (!multiplayerManager) {
        multiplayerManager = new MultiplayerManager(scene, deltaplane);
    }
    
    // Se connecter au serveur WebSocket
    try {
        await multiplayerManager.connect();
        isMultiplayerMode = true;
        gameStarted = true;
        
        // Démarrer la boucle d'animation
        animate();
    } catch (error) {
        console.error('Erreur lors de la connexion au serveur:', error);
        alert('Erreur lors de la connexion au serveur. Veuillez réessayer.');
    }
}

function init() {
    try {
        // Création de la scène
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Bleu ciel plus vif pour le style low poly

        // Création de la caméra
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
        camera.position.set(0, 100, 200); // Position originale

        // Création du renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true; // Activer les ombres
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombres douces
        document.body.appendChild(renderer.domElement);

        // Ajout des contrôles pour le développement
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 500;
        controls.maxPolarAngle = Math.PI / 2;
        controls.enabled = devMode; // Désactivé par défaut

        // Création du terrain
        terrain = createTerrain(scene);
        
        // Ajout d'une grille de référence
        createGrid(scene);

        // Création du deltaplane
        deltaplane = new Deltaplane(scene);
        
        // Passer la référence du terrain au deltaplane pour la détection de collisions
        deltaplane.setTerrain(terrain);

        // Ajout des lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Lumière ambiante plus douce
        scene.add(ambientLight);

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
        
        // Lumière secondaire pour éclairer les zones d'ombre
        const secondaryLight = new THREE.DirectionalLight(0x6666ff, 0.3); // Lumière bleutée
        secondaryLight.position.set(-50, 30, -50);
        scene.add(secondaryLight);

        // Gestion du redimensionnement de la fenêtre
        window.addEventListener('resize', onWindowResize);

        // Gestion des touches du clavier
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // Positionnement initial du deltaplane
        deltaplane.mesh.position.set(0, 100, 0);
        
        // Initialisation de la caméra pour suivre le deltaplane
        deltaplane.updateCamera(camera);
        
        // Création du gestionnaire multijoueur
        multiplayerManager = new MultiplayerManager(scene, deltaplane);
        
        // Afficher un rendu initial de la scène
        renderer.render(scene, camera);
        
        // Démarrer le jeu automatiquement (connexion au serveur)
        startGame();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
    }
}

function resetPosition() {
    // Réinitialiser la position et la vitesse du deltaplane
    deltaplane.resetPosition();
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
    // Si le jeu n'a pas encore démarré, ignorer les touches
    if (!gameStarted) return;
    
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
    // Si le jeu n'a pas encore démarré, ignorer les touches
    if (!gameStarted) return;
    
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
    // Si le jeu n'a pas encore démarré, ne pas animer
    if (!gameStarted) return;
    
    try {
        requestAnimationFrame(animate);
        
        // Récupération du temps écoulé
        const delta = clock.getDelta();
        
        // Mise à jour des contrôles de développement
        if (controls.enabled) {
            controls.update();
        } else {
            // Mise à jour du deltaplane sans passer l'élément de débogage
            deltaplane.update(delta, null);
            
            // Mise à jour de la caméra pour suivre le deltaplane
            deltaplane.updateCamera(camera);
            
            // Mise à jour du gestionnaire multijoueur si activé
            if (isMultiplayerMode) {
                multiplayerManager.update(delta);
            }
        }
        
        // Rendu de la scène
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Erreur lors de l\'animation:', error);
    }
} 