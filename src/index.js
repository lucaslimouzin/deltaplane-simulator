import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, getTerrainHeightAtPosition } from './terrain.js';
import { Deltaplane } from './deltaplane.js';
import { MultiplayerManager } from './multiplayer.js';

// Message de débogage pour vérifier si cette version est chargée
console.log("NOUVELLE VERSION DE INDEX.JS: Version avec terrain low poly");

// Variables globales
let camera, scene, renderer;
let controls;
let deltaplane;
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
        // Initialisation de la scène avec main.js
        const sceneObjects = initScene(document.body);
        scene = sceneObjects.scene;
        camera = sceneObjects.camera;
        renderer = sceneObjects.renderer;

        // Ajout des contrôles pour le développement
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 500;
        controls.maxPolarAngle = Math.PI / 2;
        controls.enabled = devMode; // Désactivé par défaut

        // Création du deltaplane
        deltaplane = new Deltaplane(scene);
        
        // Configurer le deltaplane pour utiliser la fonction getTerrainHeightAtPosition
        deltaplane.getTerrainHeightAtPosition = getTerrainHeightAtPosition;

        // Gestion des touches du clavier
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // Positionnement initial du deltaplane
        deltaplane.mesh.position.set(0, 100, 0);
        
        // Initialisation de la caméra pour suivre le deltaplane
        deltaplane.updateCamera(camera);
        
        // Création du gestionnaire multijoueur
        multiplayerManager = new MultiplayerManager(scene, deltaplane);
        
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
    // Utilisation des flèches pour tous les contrôles
    switch (event.code) {
        case 'ArrowUp':
            deltaplane.setControl('pitchUp', true); // Monter
            console.log('Monter activé');
            break;
        case 'ArrowDown':
            deltaplane.setControl('pitchDown', true); // Descendre
            console.log('Descendre activé');
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
    // Utilisation des flèches pour tous les contrôles
    switch (event.code) {
        case 'ArrowUp':
            deltaplane.setControl('pitchUp', false);
            console.log('Monter désactivé');
            break;
        case 'ArrowDown':
            deltaplane.setControl('pitchDown', false);
            console.log('Descendre désactivé');
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