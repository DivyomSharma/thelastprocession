/**
 * THE LAST PROCESSION - Main Entry Point
 * Initializes Three.js scene and game loop
 */

import * as THREE from 'three';
import { Game } from './Game.js';
import { Network } from './Network.js';
import { UI } from './UI.js';
import { Lobby } from './Lobby.js';

// Global game instance
let game = null;
let network = null;
let ui = null;
let lobby = null;

// Three.js essentials
let scene, camera, renderer;
let clock;

/**
 * Initialize the application
 */
async function init() {
    console.log('🕯️ THE LAST PROCESSION - Initializing...');

    // Create Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    scene.fog = new THREE.FogExp2(0x0a0a0c, 0.02);

    // Create camera (first-person perspective)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1.6, 0); // Eye height

    // Create renderer
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.5; // Dark atmosphere

    // Clock for delta time
    clock = new THREE.Clock();

    // Initialize systems
    network = new Network();
    ui = new UI();
    lobby = new Lobby(network, ui);
    game = new Game(scene, camera, renderer, network, ui);

    // Set up UI references
    ui.setGame(game);
    ui.setLobby(lobby);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Handle pointer lock for first-person controls
    setupPointerLock();

    // Start render loop
    animate();

    console.log('✨ Initialization complete');
}

/**
 * Handle window resize
 */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Set up pointer lock for first-person controls
 */
function setupPointerLock() {
    const gameContainer = document.getElementById('game-container');

    gameContainer.addEventListener('click', () => {
        if (game && game.isPlaying && !document.pointerLockElement) {
            gameContainer.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (game) {
            game.setPointerLocked(document.pointerLockElement === gameContainer);
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.pointerLockElement) {
            document.exitPointerLock();
        }
    });
}

/**
 * Main animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Update game if playing
    if (game && game.isPlaying) {
        game.update(delta);
    }

    // Render scene
    renderer.render(scene, camera);
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for debugging
window.gameDebug = {
    get game() { return game; },
    get network() { return network; },
    get scene() { return scene; }
};
