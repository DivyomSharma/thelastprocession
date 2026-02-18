// ─── Lobby Scene ────────────────────────────────────────────
// Waiting room — shows connected players, ready-up, host controls.

import Phaser from 'phaser';
import socketManager from '../network/socketManager.js';
import * as MSG from '../../../shared/messageTypes.js';

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    init(data) {
        this.roomState = data.roomState;
    }

    create() {
        const { width, height } = this.cameras.main;
        this.cameras.main.setBackgroundColor('#0a0a0f');

        // ─── Header ───
        this.add.text(width / 2, 28, '🕯 ROOM LOBBY', {
            fontFamily: 'Courier New',
            fontSize: '22px',
            color: '#cc8844',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Room code (clickable to copy)
        const codeText = this.add.text(width / 2, 55, `Code: ${this.roomState.roomId}`, {
            fontFamily: 'Courier New',
            fontSize: '14px',
            color: '#aa8866',
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(this.roomState.roomId);
                    codeText.setText(`Code: ${this.roomState.roomId} (copied!)`);
                    this.time.delayedCall(1500, () => codeText.setText(`Code: ${this.roomState.roomId}`));
                }
            });

        this.add.text(width / 2, 73, 'Share this code with friends to join', {
            fontFamily: 'Courier New',
            fontSize: '9px',
            color: '#665544',
        }).setOrigin(0.5);

        // ─── Divider ───
        this.add.rectangle(width / 2, 90, 350, 1, 0x333333);

        // ─── Player slots ───
        this.playerSlots = [];
        const slotStartY = 110;
        const slotHeight = 48;

        for (let i = 0; i < 6; i++) {
            const y = slotStartY + i * slotHeight;
            const bg = this.add.rectangle(width / 2, y + 20, 360, 42, 0x14141e, 0.9);

            const icon = this.add.rectangle(width / 2 - 155, y + 20, 24, 24, 0x333344);

            const nameText = this.add.text(width / 2 - 135, y + 14, 'Empty Slot', {
                fontFamily: 'Courier New',
                fontSize: '13px',
                color: '#444444',
            });

            const statusText = this.add.text(width / 2 - 135, y + 28, '', {
                fontFamily: 'Courier New',
                fontSize: '9px',
                color: '#666666',
            });

            const readyIndicator = this.add.text(width / 2 + 140, y + 20, '', {
                fontFamily: 'Courier New',
                fontSize: '14px',
                color: '#66aa66',
            }).setOrigin(0.5);

            this.playerSlots.push({ bg, icon, nameText, statusText, readyIndicator });
        }

        // ─── Ready button ───
        this.isReady = false;
        this.readyBtn = this.add.text(width / 2, height - 90, '[ READY ]', {
            fontFamily: 'Courier New',
            fontSize: '18px',
            color: '#ddccaa',
            backgroundColor: '#1e1e2a',
            padding: { x: 40, y: 12 },
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                this.readyBtn.setStyle({ backgroundColor: '#2a2a3a' });
            })
            .on('pointerout', () => {
                this.readyBtn.setStyle({
                    backgroundColor: this.isReady ? '#1a3a1a' : '#1e1e2a',
                });
            })
            .on('pointerdown', () => {
                socketManager.sendReady();
            });

        // Leave button
        this.add.text(width / 2, height - 45, '[ LEAVE ROOM ]', {
            fontFamily: 'Courier New',
            fontSize: '12px',
            color: '#886655',
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function () { this.setColor('#cc8866'); })
            .on('pointerout', function () { this.setColor('#886655'); })
            .on('pointerdown', () => {
                socketManager.leaveRoom();
                this.scene.start('MenuScene');
            });

        // ─── Status bar ───
        this.statusText = this.add.text(width / 2, height - 20, '', {
            fontFamily: 'Courier New',
            fontSize: '10px',
            color: '#665544',
        }).setOrigin(0.5);

        // ─── Countdown text ───
        this.countdownText = this.add.text(width / 2, height / 2, '', {
            fontFamily: 'Courier New',
            fontSize: '48px',
            color: '#cc8844',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(99).setAlpha(0);

        // Initial render
        this.updatePlayerList();

        // ─── Socket listeners ───
        socketManager.on(MSG.S_ROOM_STATE, (data) => {
            this.roomState = data;
            this.updatePlayerList();
        });

        socketManager.on(MSG.S_PLAYER_JOINED, ({ player }) => {
            this.roomState.players[player.id] = player;
            this.updatePlayerList();
        });

        socketManager.on(MSG.S_PLAYER_LEFT, ({ playerId }) => {
            delete this.roomState.players[playerId];
            this.updatePlayerList();
        });

        // Countdown visual handling
        this.countdownEvent = null;

        socketManager.on('countdownStart', ({ duration }) => {
            this.startCountdown(duration || 3);
        });

        socketManager.on('countdownCancelled', () => {
            this.cancelCountdown();
        });

        socketManager.on(MSG.S_GAME_START, (data) => {
            // Immediately transition (countdown finished on server)
            this.scene.start('GameScene', {
                matchState: data.matchState,
                players: data.players,
                myId: socketManager.playerId,
            });
        });
    }

    updatePlayerList() {
        const players = Object.values(this.roomState.players);
        const myId = socketManager.playerId;

        // Color palette for player icons
        const colors = [0x8b7355, 0x7b8355, 0x855b73, 0x6b7385, 0x85736b, 0x738b6b];

        for (let i = 0; i < 6; i++) {
            const slot = this.playerSlots[i];
            const player = players[i];

            if (player) {
                const isMe = player.id === myId;
                const isHost = player.id === this.roomState.hostId;

                slot.bg.setFillStyle(isMe ? 0x1e1e2e : 0x14141e, 0.9);
                slot.icon.setFillStyle(colors[i % colors.length]);

                let name = player.displayName;
                if (isMe) name += ' (you)';
                if (isHost) name += ' ★';
                slot.nameText.setText(name).setColor(isMe ? '#ddccaa' : '#bbaa88');

                slot.statusText.setText(isHost ? 'Host' : 'Player').setColor('#666655');

                if (player.isReady) {
                    slot.readyIndicator.setText('✓ READY').setColor('#66aa66');
                } else {
                    slot.readyIndicator.setText('···').setColor('#555544');
                }

                // Track own ready state for button styling
                if (isMe) {
                    this.isReady = player.isReady;
                    this.readyBtn.setText(this.isReady ? '[ UNREADY ]' : '[ READY ]');
                    this.readyBtn.setStyle({
                        backgroundColor: this.isReady ? '#1a3a1a' : '#1e1e2a',
                        color: this.isReady ? '#66cc66' : '#ddccaa',
                    });
                }
            } else {
                slot.bg.setFillStyle(0x0e0e14, 0.5);
                slot.icon.setFillStyle(0x222233);
                slot.nameText.setText('Empty Slot').setColor('#333333');
                slot.statusText.setText('');
                slot.readyIndicator.setText('');
            }
        }

        const count = players.length;
        const readyCount = players.filter(p => p.isReady).length;
        this.statusText.setText(`${count}/6 players • ${readyCount} ready`);
    }

    startCountdown(startFrom) {
        if (this.countdownEvent) {
            this.countdownEvent.remove();
        }

        let count = startFrom;
        this.countdownText.setAlpha(1);
        this.countdownText.setText(count.toString());
        this.countdownText.setScale(1);

        this.countdownEvent = this.time.addEvent({
            delay: 1000,
            repeat: startFrom,
            callback: () => {
                count--;
                if (count > 0) {
                    this.countdownText.setText(count.toString());
                    this.tweens.add({
                        targets: this.countdownText,
                        scaleX: 1.5,
                        scaleY: 1.5,
                        duration: 200,
                        yoyo: true,
                    });
                } else {
                    this.countdownText.setText('ENTERING...');
                }
            },
        });
    }

    cancelCountdown() {
        if (this.countdownEvent) {
            this.countdownEvent.remove();
            this.countdownEvent = null;
        }
        this.countdownText.setAlpha(0);
        this.tweens.killTweensOf(this.countdownText);
    }

    shutdown() {
        socketManager.off(MSG.S_ROOM_STATE);
        socketManager.off(MSG.S_PLAYER_JOINED);
        socketManager.off(MSG.S_PLAYER_LEFT);
        socketManager.off(MSG.S_GAME_START);
        socketManager.off('countdownStart');
        socketManager.off('countdownCancelled');
    }
}
