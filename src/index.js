import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, getTerrainHeightAtPosition } from './terrain.js';
import { Deltaplane } from './deltaplane.js';
import { MultiplayerManager } from './multiplayer.js';

// Debug message to verify if this version is loaded
console.log("NEW VERSION OF INDEX.JS: Version with low poly terrain");

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
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 500;
        controls.maxPolarAngle = Math.PI / 2;
        controls.enabled = devMode; // Disabled by default

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
    
    // Display key code for debugging
    console.log('Key pressed:', event.code);
    
    // Reset position with R key
    if (event.code === 'KeyR') {
        resetPosition();
        return;
    }
    
    // Don't process other keys in development mode
    if (devMode) return;
    
    // Update hang glider controls (only sail orientation)
    // Use arrows for all controls
    switch (event.code) {
        case 'ArrowUp':
            // Temporarily disabled
            //deltaplane.setControl('pitchUp', true);
            console.log('Climb disabled');
            break;
        case 'ArrowDown':
            // Temporarily disabled
            //deltaplane.setControl('pitchDown', true);
            console.log('Descend disabled');
            break;
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', true); // Roll left
            console.log('Roll left enabled');
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', true); // Roll right
            console.log('Roll right enabled');
            break;
    }
}

function onKeyUp(event) {
    // If game hasn't started, ignore keys
    if (!gameStarted) return;
    
    // Don't process keys in development mode
    if (devMode) return;
    
    // Update hang glider controls
    // Use arrows for all controls
    switch (event.code) {
        case 'ArrowUp':
            // Temporarily disabled
            //deltaplane.setControl('pitchUp', false);
            console.log('Climb disabled');
            break;
        case 'ArrowDown':
            // Temporarily disabled
            //deltaplane.setControl('pitchDown', false);
            console.log('Descend disabled');
            break;
        case 'ArrowLeft':
            deltaplane.setControl('rollLeft', false);
            console.log('Roll left disabled');
            break;
        case 'ArrowRight':
            deltaplane.setControl('rollRight', false);
            console.log('Roll right disabled');
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
        
        // Update development controls
        if (controls.enabled) {
            controls.update();
        } else {
            // Update hang glider without debug element
            deltaplane.update(delta, null);
            
            // Update camera to follow hang glider
            deltaplane.updateCamera(camera);
            
            // Update multiplayer manager if enabled
            if (isMultiplayerMode) {
                multiplayerManager.update(delta);
            }
        }
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error during animation:', error);
    }
} 