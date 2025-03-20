import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, getTerrainHeightAtPosition } from './terrain.js';
import { Deltaplane } from './deltaplane.js';
import { MultiplayerManager } from './multiplayer.js';



// Global variables
let camera, scene, renderer;
let controls;
let deltaplane;
let clock = new THREE.Clock();
let devMode = false; // Development mode disabled
let multiplayerManager; // Multiplayer manager
let isMultiplayerMode = false; // Multiplayer mode disabled by default
let gameStarted = false; // Indicates if the game has started

// Initialization
init();

// Function to start the game after connection
async function startGame() {
    // Create multiplayer manager if it doesn't exist
    if (!multiplayerManager) {
        multiplayerManager = new MultiplayerManager(scene, deltaplane);
    }
    
    // Connect to WebSocket server
    try {
        await multiplayerManager.connect();
        isMultiplayerMode = true;
        gameStarted = true;
        
        // Start animation loop
        animate();
    } catch (error) {
        console.error('Error connecting to server:', error);
        alert('Error connecting to server. Please try again.');
    }
}

function init() {
    try {
        // Initialize scene with main.js
        const sceneObjects = initScene(document.body);
        scene = sceneObjects.scene;
        camera = sceneObjects.camera;
        renderer = sceneObjects.renderer;

        // Add controls for development
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enabled = false; // Disable orbit controls
        
        // Create hang glider
        deltaplane = new Deltaplane(scene);
        
        // Configure hang glider to use getTerrainHeightAtPosition
        deltaplane.getTerrainHeightAtPosition = getTerrainHeightAtPosition;

        // Keyboard input handling
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        
        // Initial hang glider position
        deltaplane.mesh.position.set(0, 100, 0);
        
        // Initialize camera to follow hang glider
        deltaplane.updateCamera(camera);
        
        // Create multiplayer manager
        multiplayerManager = new MultiplayerManager(scene, deltaplane);
        
        // Start game automatically (connect to server)
        startGame();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

function resetPosition() {
    // Reset hang glider position and velocity
    deltaplane.resetPosition();
}

function onKeyDown(event) {
    // If game hasn't started, ignore keys
    if (!gameStarted) return;
    
    // Reset position with R key
    if (event.code === 'KeyR') {
        resetPosition();
        return;
    }
    
    // Update hang glider controls
    switch (event.code) {
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', true);
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', true);
            break;
    }
}

function onKeyUp(event) {
    // If game hasn't started, ignore keys
    if (!gameStarted) return;
    
    // Update hang glider controls
    switch (event.code) {
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', false);
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', false);
            break;
    }
}

function animate() {
    // If game hasn't started, don't animate
    if (!gameStarted) return;
    
    try {
        requestAnimationFrame(animate);
        
        // Get elapsed time
        const delta = clock.getDelta();
        
        // Update hang glider
        deltaplane.update(delta, null);
        
        // Update camera to follow hang glider
        deltaplane.updateCamera(camera);
        
        // Update multiplayer manager if enabled
        if (isMultiplayerMode) {
            multiplayerManager.update(delta);
        }
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error during animation:', error);
    }
} 