import * as THREE from 'three';

// Création d'une scène simple
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Bleu ciel

// Création d'une caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Création du renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Création d'un cube
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Animation
function animate() {
    requestAnimationFrame(animate);
    
    // Rotation du cube
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    
    // Rendu de la scène
    renderer.render(scene, camera);
}

// Gestion du redimensionnement de la fenêtre
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    
    renderer.setSize(width, height);
});

// Démarrage de l'animation
animate();

// Affichage d'un message dans la console
console.log('Test Three.js chargé avec succès'); 