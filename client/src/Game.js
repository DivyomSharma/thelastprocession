/**
 * THE LAST PROCESSION - Main Game Class
 * Manages game state, player, world, and updates
 */

import * as THREE from 'three';
import { Player } from './Player.js';
import { RemotePlayer } from './RemotePlayer.js';
import { Map as GameMap } from './Map.js';
import { Shrine } from './Shrine.js';
import { Vessel } from './Vessel.js';
import { Environment } from './Environment.js';

export class Game {
    constructor(scene, camera, renderer, network, ui) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.network = network;
        this.ui = ui;

        // Game state
        this.isPlaying = false;
        this.pointerLocked = false;
        this.role = 'villager';
        this.faith = 100;
        this.timeRemaining = 10 * 60 * 1000;
        this.phase = 'lobby'; // lobby, playing, voting, ended

        // Game objects
        this.player = null;
        this.remotePlayers = new Map();
        this.shrines = [];
        this.vessel = null;
        this.map = null;
        this.environment = null;

        // Network state
        this.positionUpdateRate = 1 / 20; // 20 updates per second
        this.positionUpdateTimer = 0;
        this.lastPosition = new THREE.Vector3();
        this.lastRotation = { y: 0 };

        // Set up network handlers
        this.setupNetworkHandlers();
    }

    /**
     * Set up network event handlers
     */
    setupNetworkHandlers() {
        // Game start
        this.network.on('gameStart', (data) => {
            console.log('🎮 Game starting!', data);
            this.startGame(data);
        });

        // Game end
        this.network.on('gameEnd', (data) => {
            console.log('🏁 Game ended:', data);
            this.endGame(data);
        });

        // Player movement
        this.network.on('playerMoved', (data) => {
            this.updateRemotePlayer(data);
        });

        // Time update
        this.network.on('timeUpdate', (data) => {
            this.timeRemaining = data.remaining;
            this.ui.updateTimer(data.remaining);
        });

        // Faith update
        this.network.on('faithUpdate', (data) => {
            this.faith = data.faith;
            this.ui.updateFaith(data.faith);
            this.updateFaithEffects();
        });

        // Shrine lit
        this.network.on('shrineLit', (data) => {
            this.onShrineLit(data);
        });

        // Vessel events
        this.network.on('vesselPickedUp', (data) => {
            this.onVesselPickedUp(data);
        });

        this.network.on('vesselTransferred', (data) => {
            this.onVesselTransferred(data);
        });

        this.network.on('vesselPlaced', (data) => {
            this.onVesselPlaced(data);
        });

        this.network.on('vesselDropped', (data) => {
            this.onVesselDropped(data);
        });

        // Voting
        this.network.on('votingStarted', (data) => {
            this.phase = 'voting';
            this.ui.showVotingScreen(data);
        });

        this.network.on('votingResult', (data) => {
            this.ui.showVotingResult(data);
        });

        this.network.on('votingEnded', () => {
            this.phase = 'playing';
            this.ui.hideVotingScreen();
        });

        this.network.on('youWereExiled', () => {
            this.onExiled();
        });

        // Player join/leave during game
        this.network.on('playerLeft', (data) => {
            this.removeRemotePlayer(data.playerId);
        });
    }

    /**
     * Start the game
     */
    startGame(data) {
        const { role, shrines, players, duration } = data;

        this.role = role;
        this.timeRemaining = duration;
        this.phase = 'playing';
        this.isPlaying = true;

        // Create environment
        this.environment = new Environment(this.scene);

        // Create map
        this.map = new GameMap(this.scene);

        // Create shrines
        this.shrines = [];
        shrines.forEach(shrineData => {
            const shrine = new Shrine(this.scene, shrineData);
            this.shrines.push(shrine);
        });

        // Create vessel (at spawn location)
        this.vessel = new Vessel(this.scene, { x: 0, y: 0.5, z: 0 });

        // Create local player
        this.player = new Player(this.camera, this.map);
        this.player.position.set(0, 1.6, 0);

        // Create remote players
        players.forEach(playerData => {
            if (playerData.id !== this.network.getPlayerId()) {
                this.createRemotePlayer(playerData);
            }
        });

        // Update UI
        this.ui.showHUD();
        this.ui.setRole(role);
        this.ui.updateFaith(100);
        this.ui.updateTimer(duration);

        // Request pointer lock
        document.getElementById('game-container').requestPointerLock();

        console.log(`🎭 You are a ${role.toUpperCase()}`);
    }

    /**
     * End the game
     */
    endGame(data) {
        this.isPlaying = false;
        this.phase = 'ended';

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Show end screen
        this.ui.showEndScreen(data);
    }

    /**
     * Create a remote player
     */
    createRemotePlayer(playerData) {
        const remotePlayer = new RemotePlayer(this.scene, playerData);
        this.remotePlayers.set(playerData.id, remotePlayer);
    }

    /**
     * Update remote player position
     */
    updateRemotePlayer(data) {
        const remotePlayer = this.remotePlayers.get(data.playerId);
        if (remotePlayer) {
            remotePlayer.setTargetPosition(data.position, data.rotation);
        }
    }

    /**
     * Remove a remote player
     */
    removeRemotePlayer(playerId) {
        const remotePlayer = this.remotePlayers.get(playerId);
        if (remotePlayer) {
            remotePlayer.dispose();
            this.remotePlayers.delete(playerId);
        }
    }

    /**
     * Update loop
     */
    update(delta) {
        if (!this.isPlaying || this.phase !== 'playing') return;

        // Update player
        if (this.player && this.pointerLocked) {
            this.player.update(delta);
        }

        // Update remote players
        this.remotePlayers.forEach(remotePlayer => {
            remotePlayer.update(delta);
        });

        // Update shrines
        this.shrines.forEach(shrine => {
            shrine.update(delta);
        });

        // Update vessel
        if (this.vessel) {
            this.vessel.update(delta, this.player);
        }

        // Update environment
        if (this.environment) {
            this.environment.update(delta, this.faith);
        }

        // Send position updates
        this.positionUpdateTimer += delta;
        if (this.positionUpdateTimer >= this.positionUpdateRate) {
            this.sendPositionUpdate();
            this.positionUpdateTimer = 0;
        }

        // Check interactions
        this.checkInteractions();
    }

    /**
     * Send position update to server
     */
    sendPositionUpdate() {
        if (!this.player) return;

        const pos = this.player.position;
        const rot = { y: this.player.rotation.y };

        // Only send if position changed significantly
        const dx = pos.x - this.lastPosition.x;
        const dy = pos.y - this.lastPosition.y;
        const dz = pos.z - this.lastPosition.z;
        const dr = rot.y - this.lastRotation.y;

        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 ||
            Math.abs(dz) > 0.01 || Math.abs(dr) > 0.01) {
            this.network.sendPosition(
                { x: pos.x, y: pos.y, z: pos.z },
                rot
            );
            this.lastPosition.copy(pos);
            this.lastRotation.y = rot.y;
        }
    }

    /**
     * Check for nearby interactables
     */
    checkInteractions() {
        if (!this.player) return;

        const playerPos = this.player.position;
        let nearestInteractable = null;
        let nearestDistance = Infinity;

        // Check shrines
        this.shrines.forEach(shrine => {
            if (!shrine.isLit) {
                const distance = shrine.getDistanceTo(playerPos);
                if (distance < 3 && distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestInteractable = { type: 'shrine', object: shrine };
                }
            }
        });

        // Check vessel (if not carrying)
        if (this.vessel && !this.vessel.isCarried && !this.player.carrying) {
            const distance = this.vessel.getDistanceTo(playerPos);
            if (distance < 2 && distance < nearestDistance) {
                nearestDistance = distance;
                nearestInteractable = { type: 'vessel', object: this.vessel };
            }
        }

        // Check altar (if carrying vessel and near final shrine)
        if (this.player.carrying === 'vessel') {
            const altar = this.shrines[6]; // Shrine 7 (index 6)
            if (altar) {
                const distance = altar.getDistanceTo(playerPos);
                if (distance < 3) {
                    nearestInteractable = { type: 'altar', object: altar };
                }
            }
        }

        // Update interaction prompt
        if (nearestInteractable) {
            let promptText = '';
            switch (nearestInteractable.type) {
                case 'shrine':
                    promptText = 'Hold E to light shrine';
                    break;
                case 'vessel':
                    promptText = 'Press E to pick up vessel';
                    break;
                case 'altar':
                    promptText = 'Press E to place vessel';
                    break;
            }
            this.ui.showInteractionPrompt(promptText);
            this.currentInteractable = nearestInteractable;
        } else {
            this.ui.hideInteractionPrompt();
            this.currentInteractable = null;
        }
    }

    /**
     * Handle interaction input
     */
    interact(held = false) {
        if (!this.currentInteractable) return;

        switch (this.currentInteractable.type) {
            case 'shrine':
                if (held) {
                    this.interactWithShrine(this.currentInteractable.object);
                }
                break;
            case 'vessel':
                this.pickupVessel();
                break;
            case 'altar':
                this.placeVessel();
                break;
        }
    }

    /**
     * Interact with a shrine (hold E)
     */
    interactWithShrine(shrine) {
        if (shrine.isLit) return;

        // Progress the interaction
        shrine.progress += 0.02; // About 3 seconds to light

        if (shrine.progress >= 1) {
            this.network.lightShrine(shrine.id);
            shrine.progress = 0;
        }

        this.ui.showInteractionProgress(shrine.progress);
    }

    /**
     * Handle shrine lit event
     */
    onShrineLit(data) {
        const shrine = this.shrines.find(s => s.id === data.shrineId);
        if (shrine) {
            shrine.light();
            this.ui.updateShrineProgress(data.shrineId, true);
        }
    }

    /**
     * Pick up the vessel
     */
    pickupVessel() {
        this.network.pickupVessel();
    }

    /**
     * Handle vessel picked up event
     */
    onVesselPickedUp(data) {
        if (data.playerId === this.network.getPlayerId()) {
            this.player.carrying = 'vessel';
            this.vessel.attachTo(this.player);
            this.ui.showVesselIndicator(true);
        } else {
            const remotePlayer = this.remotePlayers.get(data.playerId);
            if (remotePlayer) {
                this.vessel.attachTo(remotePlayer);
            }
        }
    }

    /**
     * Handle vessel transferred event
     */
    onVesselTransferred(data) {
        const fromPlayerId = data.fromPlayerId;
        const toPlayerId = data.toPlayerId;
        const myId = this.network.getPlayerId();

        // Update carrying state
        if (fromPlayerId === myId) {
            this.player.carrying = null;
            this.ui.showVesselIndicator(false);
        }

        if (toPlayerId === myId) {
            this.player.carrying = 'vessel';
            this.vessel.attachTo(this.player);
            this.ui.showVesselIndicator(true);
        } else {
            const remotePlayer = this.remotePlayers.get(toPlayerId);
            if (remotePlayer) {
                this.vessel.attachTo(remotePlayer);
            }
        }
    }

    /**
     * Place the vessel at the altar
     */
    placeVessel() {
        if (this.player.carrying === 'vessel') {
            this.network.placeVessel();
        }
    }

    /**
     * Handle vessel placed event
     */
    onVesselPlaced(data) {
        this.vessel.placeAtAltar(this.shrines[6].position);

        if (data.playerId === this.network.getPlayerId()) {
            this.player.carrying = null;
            this.ui.showVesselIndicator(false);
        }
    }

    /**
     * Handle vessel dropped (player disconnect)
     */
    onVesselDropped(data) {
        this.vessel.dropAt(data.position);
    }

    /**
     * Handle being exiled
     */
    onExiled() {
        this.isPlaying = false;
        this.ui.showExiledOverlay();

        // Switch to spectator mode (simplified)
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    /**
     * Update faith-based visual effects
     */
    updateFaithEffects() {
        document.body.classList.remove('faith-low', 'faith-critical');

        if (this.faith < 20) {
            document.body.classList.add('faith-critical');
        } else if (this.faith < 40) {
            document.body.classList.add('faith-low');
        }
    }

    /**
     * Set pointer lock state
     */
    setPointerLocked(locked) {
        this.pointerLocked = locked;
        if (this.player) {
            this.player.setEnabled(locked);
        }
    }

    /**
     * Clean up game resources
     */
    dispose() {
        this.isPlaying = false;

        if (this.player) {
            this.player.dispose();
        }

        this.remotePlayers.forEach(rp => rp.dispose());
        this.remotePlayers.clear();

        this.shrines.forEach(shrine => shrine.dispose());
        this.shrines = [];

        if (this.vessel) {
            this.vessel.dispose();
        }

        if (this.map) {
            this.map.dispose();
        }

        if (this.environment) {
            this.environment.dispose();
        }
    }
}
