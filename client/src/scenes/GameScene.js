// ─── Game Scene ─────────────────────────────────────────────
// Core gameplay: tilemap, multiplayer sync, fog-of-war,
// shrine interaction, proximity chat, game timer.

import Phaser from 'phaser';
import socketManager from '../network/socketManager.js';
import * as MSG from '../../../shared/messageTypes.js';
import { TILE_SIZE } from '../../../shared/constants.js';
import FogOfWar from '../systems/FogOfWar.js';
import InputManager from '../systems/InputManager.js';

const MAP_TILES_W = 30;
const MAP_TILES_H = 30;
const MAP_PX_W = MAP_TILES_W * TILE_SIZE;
const MAP_PX_H = MAP_TILES_H * TILE_SIZE;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        this.matchData = data.matchState || {};
        this.playersData = data.players || {};
        this.myId = data.myId || socketManager.playerId;
    }

    create() {
        try {
            console.log('[GameScene] Creating...');
            const { width, height } = this.cameras.main;

            // ─── Build tilemap ───
            this.buildTileMap();
            console.log('[GameScene] Tilemap built');

            // ─── Player sprites ───
            this.playerSprites = {};
            this.playerLabels = {};
            this.chatBubbles = {};

            // Assign villager variant per player index
            const playerIds = Object.keys(this.playersData);
            console.log('[GameScene] Creating sprites for players:', playerIds);
            playerIds.forEach((id, index) => {
                const p = this.playersData[id];
                this.createPlayerSprite(id, p.x, p.y, p.displayName, index);
            });

            // ─── Camera ───
            const localSprite = this.playerSprites[this.myId];
            if (localSprite) {
                this.cameras.main.startFollow(localSprite, true, 0.1, 0.1);
                this.cameras.main.setZoom(2);
                this.cameras.main.setBounds(0, 0, MAP_PX_W, MAP_PX_H);
            } else {
                console.warn('[GameScene] Local player sprite not found for ID:', this.myId);
            }

            // ─── Shrine sprites ───
            this.shrineSprites = {};
            if (this.matchData.shrines) {
                this.matchData.shrines.forEach(shrine => {
                    const s = this.add.sprite(shrine.x, shrine.y, 'shrine').setDepth(1);
                    this.shrineSprites[shrine.id] = s;
                });
            }

            // ─── Fog of War ───
            this.fogOfWar = new FogOfWar(this, MAP_TILES_W, MAP_TILES_H);
            console.log('[GameScene] FogOfWar initialized');

            // ─── Input ───
            this.inputManager = new InputManager(this);

            // ─── UI layer (fixed to camera) ───
            this.timerText = this.add.text(4, 4, 'Time: 7:00', {
                fontFamily: 'Courier New',
                fontSize: '10px',
                color: '#ccaa77',
            }).setScrollFactor(0).setDepth(100);

            this.progressText = this.add.text(4, 16, 'Ritual: 0%', {
                fontFamily: 'Courier New',
                fontSize: '10px',
                color: '#aacc77',
            }).setScrollFactor(0).setDepth(100);

            this.interactHint = this.add.text(width / 2, height - 20, '', {
                fontFamily: 'Courier New',
                fontSize: '9px',
                color: '#ccaa66',
            }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

            // ─── Chat input ───
            this.chatActive = false;
            this.chatInput = '';
            this.chatDisplay = this.add.text(4, height - 16, '', {
                fontFamily: 'Courier New',
                fontSize: '9px',
                color: '#aaaaaa',
                backgroundColor: '#111118',
                padding: { x: 4, y: 2 },
            }).setScrollFactor(0).setDepth(101).setAlpha(0);

            // T key to toggle chat
            this.input.keyboard.on('keydown-T', () => {
                if (!this.chatActive) {
                    this.chatActive = true;
                    this.chatInput = '';
                    this.chatDisplay.setAlpha(1);
                    this.chatDisplay.setText('> _');
                }
            });

            this.input.keyboard.on('keydown-ENTER', () => {
                if (this.chatActive && this.chatInput.trim()) {
                    socketManager.sendChat(this.chatInput);
                    this.chatActive = false;
                    this.chatDisplay.setAlpha(0);
                    this.chatInput = '';
                }
            });

            this.input.keyboard.on('keydown-ESC', () => {
                if (this.chatActive) {
                    this.chatActive = false;
                    this.chatDisplay.setAlpha(0);
                    this.chatInput = '';
                }
            });

            this.input.keyboard.on('keydown', (event) => {
                if (!this.chatActive) return;
                if (event.key === 'Backspace') {
                    this.chatInput = this.chatInput.slice(0, -1);
                } else if (event.key.length === 1 && this.chatInput.length < 100) {
                    this.chatInput += event.key;
                }
                this.chatDisplay.setText(`> ${this.chatInput}_`);
            });

            // ─── Socket listeners ───
            socketManager.on(MSG.S_STATE_UPDATE, (snapshot) => {
                this.handleStateUpdate(snapshot);
            });

            socketManager.on(MSG.S_PLAYER_JOINED, ({ player }) => {
                const idx = Object.keys(this.playerSprites).length;
                this.createPlayerSprite(player.id, player.x, player.y, player.displayName, idx);
            });

            socketManager.on(MSG.S_PLAYER_LEFT, ({ playerId }) => {
                this.removePlayerSprite(playerId);
            });

            socketManager.on('shrineActivated', ({ shrineId, progress }) => {
                const shrineSprite = this.shrineSprites[shrineId];
                if (shrineSprite) {
                    shrineSprite.setTexture('shrine_active');
                    // Flash effect
                    this.tweens.add({
                        targets: shrineSprite,
                        alpha: 0.3,
                        duration: 150,
                        yoyo: true,
                        repeat: 3,
                    });
                }
                this.progressText.setText(`Ritual: ${progress}%`);
            });

            socketManager.on('chatMessage', ({ playerId, playerName, message, x, y }) => {
                this.showChatBubble(playerId, playerName, message, x, y);
            });

            socketManager.on(MSG.S_GAME_OVER, ({ result, message }) => {
                this.scene.start('EndScene', { result, message });
            });

            socketManager.on(MSG.S_ATTUNEMENT_HINT, ({ level, type }) => {
                this.handleAttunementHint(level, type);
            });

            // ─── Possession FX ───
            this.createVignette();
            this.hallucinationTimer = 0;

            console.log('[GameScene] Created successfully');
        } catch (err) {
            console.error('[GameScene] Error in create:', err);
            this.add.text(10, 10, `ERROR: ${err.message}`, { color: '#ff0000', backgroundColor: '#000000' }).setScrollFactor(0).setDepth(999);
        }
    }

    createVignette() {
        const { width, height } = this.cameras.main;
        this.vignette = this.add.image(width / 2, height / 2, 'vignette')
            .setScrollFactor(0)
            .setDepth(150)
            .setAlpha(0);

        // Red overlay for max possession
        this.bloodOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x660000)
            .setScrollFactor(0)
            .setDepth(149)
            .setAlpha(0);
    }

    handleAttunementHint(level, type) {
        console.log(`[GameScene] Attunement Hint: ${type} at ${level}%`);

        // Vignette intensity
        let targetAlpha = 0;
        if (level >= 90) targetAlpha = 0.8;
        else if (level >= 75) targetAlpha = 0.5;
        else if (level >= 50) targetAlpha = 0.3;
        else if (level >= 25) targetAlpha = 0.1;

        this.tweens.add({
            targets: this.vignette,
            alpha: targetAlpha,
            duration: 2000
        });

        // Stage 4: Red tint
        if (level >= 90) {
            this.tweens.add({
                targets: this.bloodOverlay,
                alpha: 0.3,
                duration: 5000,
                yoyo: true,
                repeat: -1
            });
        }

        // Visual feedback based on level (Flash/Shake)
        let duration = 500;
        let shake = 0;

        if (level >= 90) { duration = 1000; shake = 0.02; }
        else if (level >= 75) { duration = 800; shake = 0.01; }
        else if (level >= 50) { duration = 500; shake = 0.005; }
        else { duration = 200; shake = 0; }

        this.cameras.main.flash(duration, 50, 0, 0);

        if (shake > 0) {
            this.cameras.main.shake(duration / 2, shake);
        }

        // Text hint
        const messages = {
            25: "You feel watched...",
            50: "The shadows are lengthening...",
            75: "Something is breathing down your neck...",
            90: "RUN."
        };

        const msg = messages[level] || "You feel uneasy.";
        this.showFloatingText(msg);
    }

    showFloatingText(msg) {
        const { width, height } = this.cameras.main;
        const text = this.add.text(width / 2, height / 3, msg, {
            fontFamily: 'Courier New',
            fontSize: '12px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

        this.tweens.add({
            targets: text,
            alpha: 0,
            y: height / 3 - 30,
            duration: 4000,
            ease: 'Power2',
            onComplete: () => text.destroy()
        });
    }

    updateHallucinations() {
        // Random chance to spawn "fake" red eyes in the dark
        if (Math.random() < 0.005) { // 0.5% chance per frame
            const { width, height } = this.cameras.main;
            const x = this.cameras.main.worldView.x + Math.random() * width;
            const y = this.cameras.main.worldView.y + Math.random() * height;

            const eyes = this.add.text(x, y, 'OO', {
                fontFamily: 'Courier New',
                fontSize: '10px',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setDepth(10).setAlpha(0);

            this.tweens.add({
                targets: eyes,
                alpha: 1,
                duration: 200,
                yoyo: true,
                hold: 500,
                onComplete: () => eyes.destroy()
            });
        }
    }


    createPlayerSprite(id, x, y, displayName, index) {
        const textureKey = `villager_${index % 6}`;
        const sprite = this.add.sprite(x, y, textureKey).setDepth(5);

        const label = this.add.text(x, y - 22, displayName, {
            fontFamily: 'Courier New',
            fontSize: '7px',
            color: id === this.myId ? '#eeddaa' : '#998877',
        }).setOrigin(0.5).setDepth(6);

        this.playerSprites[id] = sprite;
        this.playerLabels[id] = label;

        // Interpolation state for remote players
        if (id !== this.myId) {
            sprite._targetX = x;
            sprite._targetY = y;
            sprite._prevX = x;
            sprite._prevY = y;
            sprite._lerpT = 0;
        }
    }

    removePlayerSprite(id) {
        if (this.playerSprites[id]) {
            this.playerSprites[id].destroy();
            delete this.playerSprites[id];
        }
        if (this.playerLabels[id]) {
            this.playerLabels[id].destroy();
            delete this.playerLabels[id];
        }
        if (this.chatBubbles[id]) {
            this.chatBubbles[id].destroy();
            delete this.chatBubbles[id];
        }
    }

    handleStateUpdate(snapshot) {
        if (!snapshot || !snapshot.players) return;

        for (const [id, pData] of Object.entries(snapshot.players)) {
            const sprite = this.playerSprites[id];
            if (!sprite) continue;

            if (id === this.myId) {
                // Snap local player to server position (reconciliation)
                sprite.setPosition(pData.x, pData.y);
            } else {
                // Set interpolation target for remote players
                sprite._prevX = sprite.x;
                sprite._prevY = sprite.y;
                sprite._targetX = pData.x;
                sprite._targetY = pData.y;
                sprite._lerpT = 0;
            }
        }

        // Update timer
        if (snapshot.timeLeft != null) {
            const mins = Math.floor(snapshot.timeLeft / 60);
            const secs = Math.floor(snapshot.timeLeft % 60);
            this.timerText.setText(`Time: ${mins}:${secs.toString().padStart(2, '0')}`);
        }

        // Update progress
        if (snapshot.progress != null) {
            this.progressText.setText(`Ritual: ${snapshot.progress}%`);
        }
    }

    showChatBubble(playerId, playerName, message, msgX, msgY) {
        // Only show within proximity (200px radius from local player)
        const local = this.playerSprites[this.myId];
        if (local) {
            const dx = local.x - msgX;
            const dy = local.y - msgY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 200) return; // Too far, can't hear
        }

        // Remove existing bubble
        if (this.chatBubbles[playerId]) {
            this.chatBubbles[playerId].destroy();
        }

        const sprite = this.playerSprites[playerId];
        if (!sprite) return;

        const bubble = this.add.text(sprite.x, sprite.y - 32, message, {
            fontFamily: 'Courier New',
            fontSize: '7px',
            color: '#eeeeee',
            backgroundColor: '#1a1a24',
            padding: { x: 3, y: 2 },
            wordWrap: { width: 120 },
        }).setOrigin(0.5, 1).setDepth(10);

        this.chatBubbles[playerId] = bubble;

        // Fade out after 4 seconds
        this.tweens.add({
            targets: bubble,
            alpha: 0,
            delay: 3500,
            duration: 500,
            onComplete: () => {
                bubble.destroy();
                if (this.chatBubbles[playerId] === bubble) {
                    delete this.chatBubbles[playerId];
                }
            },
        });
    }

    update(time, delta) {
        // ─── Input (skip if chatting) ───
        if (!this.chatActive) {
            const input = this.inputManager.getInput();
            if (input.dx !== 0 || input.dy !== 0) {
                socketManager.sendMovement(input.dx, input.dy);
            }

            // Interact on E press
            if (input.interact) {
                socketManager.sendInteract({});
            }
        }

        // ─── Interpolate remote players ───
        const lerpSpeed = 0.15;
        for (const [id, sprite] of Object.entries(this.playerSprites)) {
            if (id === this.myId) continue;

            if (sprite._targetX != null) {
                sprite._lerpT = Math.min(1, (sprite._lerpT || 0) + lerpSpeed);
                const t = sprite._lerpT;

                sprite.x = Phaser.Math.Linear(sprite._prevX, sprite._targetX, t);
                sprite.y = Phaser.Math.Linear(sprite._prevY, sprite._targetY, t);
            }

            // Update label position
            const label = this.playerLabels[id];
            if (label) {
                label.setPosition(sprite.x, sprite.y - 22);
            }
        }

        // ─── Update local player label position ───
        const localSprite = this.playerSprites[this.myId];
        const localLabel = this.playerLabels[this.myId];
        if (localSprite && localLabel) {
            localLabel.setPosition(localSprite.x, localSprite.y - 22);
        }

        // ─── Update chat bubble positions ───
        for (const [id, bubble] of Object.entries(this.chatBubbles)) {
            const sprite = this.playerSprites[id];
            if (sprite && bubble && bubble.active) {
                bubble.setPosition(sprite.x, sprite.y - 32);
            }
        }

        // ─── Interaction hint ───
        if (localSprite && this.matchData.shrines) {
            let nearShrine = false;
            for (const shrine of this.matchData.shrines) {
                const dx = localSprite.x - shrine.x;
                const dy = localSprite.y - shrine.y;
                if (Math.sqrt(dx * dx + dy * dy) < 48) {
                    nearShrine = true;
                    break;
                }
            }
            if (nearShrine) {
                this.interactHint.setText('[E] Activate Shrine').setAlpha(1);
            } else {
                this.interactHint.setAlpha(0);
            }
        }

        // ─── Fog of war ───
        const lightSources = [];
        if (localSprite) {
            lightSources.push({ x: localSprite.x, y: localSprite.y, radius: 120 });
        }
        // Add torches/shrines as ambient lights
        if (this.matchData.shrines) {
            for (const shrine of this.matchData.shrines) {
                lightSources.push({ x: shrine.x, y: shrine.y, radius: 60 });
            }
        }
        this.fogOfWar.update(lightSources);

        // ─── Hallucinations ───
        if (this.vignette && this.vignette.alpha > 0.3) { // Only if attunement is high enough (Stage 2+)
            this.updateHallucinations();
        }
    }

    buildTileMap() {
        // Procedural village — grass with path cross and central square
        for (let y = 0; y < MAP_TILES_H; y++) {
            for (let x = 0; x < MAP_TILES_W; x++) {
                const px = x * TILE_SIZE + TILE_SIZE / 2;
                const py = y * TILE_SIZE + TILE_SIZE / 2;

                const cx = MAP_TILES_W / 2;
                const cy = MAP_TILES_H / 2;

                // Central square area (4x4 tiles)
                if (Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2) {
                    this.add.sprite(px, py, 'tile_path').setDepth(0);
                    continue;
                }

                // Cross-shaped paths
                if (Math.abs(x - cx) <= 1 || Math.abs(y - cy) <= 1) {
                    this.add.sprite(px, py, 'tile_path').setDepth(0);
                    continue;
                }

                // Perimeter walls
                if (x === 0 || x === MAP_TILES_W - 1 || y === 0 || y === MAP_TILES_H - 1) {
                    this.add.sprite(px, py, 'tile_wall').setDepth(0);
                    continue;
                }

                // Random buildings / wall clusters
                if (this.isBuilding(x, y, cx, cy)) {
                    this.add.sprite(px, py, 'tile_wall').setDepth(0);
                    continue;
                }

                // Default: grass
                this.add.sprite(px, py, 'tile_grass').setDepth(0);
            }
        }
    }

    isBuilding(x, y, cx, cy) {
        // Deterministic "building" placement based on position
        const seed = (x * 73 + y * 137) % 100;

        // Building clusters in quadrants
        const buildings = [
            { bx: 5, by: 5, w: 3, h: 3 },
            { bx: 22, by: 5, w: 4, h: 3 },
            { bx: 5, by: 22, w: 3, h: 4 },
            { bx: 23, by: 22, w: 3, h: 3 },
            { bx: 10, by: 10, w: 2, h: 2 },
            { bx: 18, by: 10, w: 2, h: 3 },
            { bx: 8, by: 20, w: 3, h: 2 },
            { bx: 20, by: 18, w: 2, h: 2 },
        ];

        for (const b of buildings) {
            if (x >= b.bx && x < b.bx + b.w && y >= b.by && y < b.by + b.h) {
                return true;
            }
        }
        return false;
    }

    shutdown() {
        if (this.fogOfWar) {
            this.fogOfWar.destroy();
        }
        socketManager.off(MSG.S_STATE_UPDATE);
        socketManager.off(MSG.S_PLAYER_JOINED);
        socketManager.off(MSG.S_PLAYER_LEFT);
        socketManager.off(MSG.S_GAME_OVER);
        socketManager.off(MSG.S_ATTUNEMENT_HINT);
        socketManager.off('shrineActivated');
        socketManager.off('chatMessage');
    }
}
