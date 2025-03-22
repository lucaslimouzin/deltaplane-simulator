import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initScene, getTerrainHeightAtPosition } from './terrain.js';
import { Deltaplane } from './deltaplane.js';
import { MultiplayerManager } from './multiplayer.js';
import { TouchControls } from './touchControls.js';
import { AIPlaneurManager } from './aiPlaneurs.js';
import { CloudSystem } from './clouds.js';

// Global variables
let camera, scene, renderer;
let controls;
let touchControls;
let clock = new THREE.Clock();
let devMode = false; // Development mode disabled
let multiplayerManager; // Multiplayer manager
let isMultiplayerMode = false; // Multiplayer mode disabled by default
let gameStarted = false; // Indicates if the game has started
let aiManager;  // Gestionnaire des planeurs IA
let cloudSystem; // Système de nuages

// Rendre le deltaplane accessible globalement
window.deltaplane = null;

// Initialization
init();

// Function to start the game after connection
async function startGame() {
    // Create multiplayer manager if it doesn't exist
    if (!multiplayerManager) {
        multiplayerManager = new MultiplayerManager(scene, window.deltaplane);
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
        
        // Create hang glider and make it globally accessible
        window.deltaplane = new Deltaplane(scene);
        
        // Configure hang glider to use getTerrainHeightAtPosition
        window.deltaplane.getTerrainHeightAtPosition = getTerrainHeightAtPosition;

        // Initialize AI Manager
        aiManager = new AIPlaneurManager(scene);

        // Initialize cloud system
        cloudSystem = new CloudSystem(scene);

        // Initialize touch controls if on mobile device
        if (TouchControls.isMobileDevice()) {
            touchControls = new TouchControls(window.deltaplane);
        } else {
            // Keyboard input handling for desktop
            window.addEventListener('keydown', onKeyDown);
            window.addEventListener('keyup', onKeyUp);
        }
        
        // Initial hang glider position
        window.deltaplane.mesh.position.set(0, 100, 0);
        
        // Initialize camera to follow hang glider
        window.deltaplane.updateCamera(camera);
        
        // Start game with multiplayer login
        startGame();

        // Add resize handler
        window.addEventListener('resize', onWindowResize, false);

        // Add sprint button for mobile
        const sprintButton = document.createElement('button');
        sprintButton.innerHTML = 'SPRINT';
        sprintButton.style.cssText = `
            position: fixed;
            bottom: 120px;
            right: 20px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 5px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            touch-action: manipulation;
            user-select: none;
            z-index: 1000;
        `;

        document.body.appendChild(sprintButton);

        // Sprint button touch events
        let isSprinting = false;
        sprintButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            window.deltaplane.toggleSprint(true);
            isSprinting = true;
        });

        sprintButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            window.deltaplane.toggleSprint(false);
            isSprinting = false;
        });

        // Keyboard sprint control
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !isSprinting) {
                window.deltaplane.toggleSprint(true);
                isSprinting = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                window.deltaplane.toggleSprint(false);
                isSprinting = false;
            }
        });
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetPosition() {
    // Reset hang glider position and velocity
    window.deltaplane.resetPosition();
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
            window.deltaplane.setControl('rollLeft', true);
            break;
        case 'ArrowRight':
            window.deltaplane.setControl('rollRight', true);
            break;
    }
}

function onKeyUp(event) {
    // If game hasn't started, ignore keys
    if (!gameStarted) return;
    
    // Update hang glider controls
    switch (event.code) {
        case 'ArrowLeft':
            window.deltaplane.setControl('rollLeft', false);
            break;
        case 'ArrowRight':
            window.deltaplane.setControl('rollRight', false);
            break;
    }
}

function updateInfoPanel() {
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel && window.deltaplane) {
        infoPanel.innerHTML = `
            <div>FPS: ${Math.round(window.deltaplane.currentFPS)}</div>
            <div>Online: ${window.deltaplane.playerCount}</div>
            <div>Controls: ← →</div>
        `;
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
        window.deltaplane.update(delta, null);
        
        // Update AI planeurs
        if (aiManager && window.deltaplane.mesh) {
            aiManager.update(delta, window.deltaplane.mesh.position, window.deltaplane.thermalPositions);
        }

        // Update clouds with player position
        if (cloudSystem && window.deltaplane.mesh) {
            cloudSystem.update(delta, window.deltaplane.mesh.position);
        }
        
        // Update camera to follow hang glider
        window.deltaplane.updateCamera(camera);

        // Update info panel
        updateInfoPanel();
        
        // Render scene
        renderer.render(scene, camera);
    } catch (error) {
        console.error('Error during animation:', error);
    }
} 