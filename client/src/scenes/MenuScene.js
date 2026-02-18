// ─── Menu Scene ─────────────────────────────────────────────
// Main menu with create/join room and room browser.

import Phaser from 'phaser';
import socketManager from '../network/socketManager.js';
import * as MSG from '../../../shared/messageTypes.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Connect to server
        socketManager.connect();

        // ─── Background ambience ───
        this.cameras.main.setBackgroundColor('#0a0a0f');

        // Subtle animated particles (embers)
        this.embers = [];
        for (let i = 0; i < 20; i++) {
            const ember = this.add.rectangle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                2, 2,
                Phaser.Math.RND.pick([0xcc6633, 0xff9944, 0xaa4422])
            ).setAlpha(Phaser.Math.FloatBetween(0.2, 0.6));
            ember._vy = Phaser.Math.FloatBetween(-0.3, -0.8);
            ember._vx = Phaser.Math.FloatBetween(-0.2, 0.2);
            this.embers.push(ember);
        }

        // ─── Title ───
        this.add.text(width / 2, 60, '🕯 THE LAST PROCESSION 🕯', {
            fontFamily: 'Courier New',
            fontSize: '28px',
            color: '#cc8844',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        this.add.text(width / 2, 92, 'A Folk Horror Ritual', {
            fontFamily: 'Courier New',
            fontSize: '14px',
            color: '#886644',
        }).setOrigin(0.5);

        // ─── Name Input ───
        this.playerName = localStorage.getItem('playerName') || 'Villager';
        this.nameDisplay = this.add.text(width / 2, 130, `Name: ${this.playerName}`, {
            fontFamily: 'Courier New',
            fontSize: '12px',
            color: '#998877',
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.nameDisplay.setColor('#ddccaa'))
            .on('pointerout', () => this.nameDisplay.setColor('#998877'))
            .on('pointerdown', () => this.showNameInput());

        // ─── Buttons ───
        const btnY = 175;
        const btnStyle = {
            fontFamily: 'Courier New',
            fontSize: '16px',
            color: '#ddccaa',
            backgroundColor: '#1e1e2a',
            padding: { x: 20, y: 10 },
        };

        const createBtn = this.add.text(width / 2 - 110, btnY, '[ CREATE ROOM ]', btnStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => createBtn.setStyle({ color: '#ffcc66', backgroundColor: '#2a2a3a' }))
            .on('pointerout', () => createBtn.setStyle({ color: '#ddccaa', backgroundColor: '#1e1e2a' }))
            .on('pointerdown', () => this.createRoom());

        const joinBtn = this.add.text(width / 2 + 110, btnY, '[ JOIN BY CODE ]', btnStyle)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => joinBtn.setStyle({ color: '#ffcc66', backgroundColor: '#2a2a3a' }))
            .on('pointerout', () => joinBtn.setStyle({ color: '#ddccaa', backgroundColor: '#1e1e2a' }))
            .on('pointerdown', () => this.showJoinInput());

        // ─── Room Browser ───
        this.add.text(width / 2, 220, '─── OPEN ROOMS ───', {
            fontFamily: 'Courier New',
            fontSize: '12px',
            color: '#665544',
        }).setOrigin(0.5);

        this.roomListContainer = this.add.container(0, 245);
        this.roomListText = this.add.text(width / 2, 260, 'Searching for rooms...', {
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#555544',
        }).setOrigin(0.5, 0);

        // Refresh button
        this.add.text(width / 2, height - 40, '[ REFRESH ]', {
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#665544',
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.requestRoomList());

        // ─── Status text ───
        this.statusText = this.add.text(width / 2, height - 20, '', {
            fontFamily: 'Courier New',
            fontSize: '11px',
            color: '#cc4444',
        }).setOrigin(0.5);

        // ─── Connection indicator ───
        this.connDot = this.add.circle(width - 20, 20, 5, 0x444444);
        this.connLabel = this.add.text(width - 30, 20, '', {
            fontFamily: 'Courier New',
            fontSize: '9px',
            color: '#666666',
        }).setOrigin(1, 0.5);

        // ─── Socket listeners ───
        socketManager.on(MSG.S_ROOM_STATE, (data) => {
            this.scene.start('LobbyScene', { roomState: data });
        });

        socketManager.on(MSG.S_ERROR, ({ message }) => {
            this.statusText.setText(message);
            this.time.delayedCall(3000, () => this.statusText.setText(''));
        });

        socketManager.on('roomList', (rooms) => {
            this.displayRoomList(rooms);
        });

        // Request room list once connected
        this.time.delayedCall(500, () => this.requestRoomList());
    }

    update() {
        // Animate embers
        const { width, height } = this.cameras.main;
        for (const ember of this.embers) {
            ember.y += ember._vy;
            ember.x += ember._vx;
            ember.alpha += Math.sin(this.time.now * 0.005 + ember.x) * 0.01;
            if (ember.y < -10) {
                ember.y = height + 10;
                ember.x = Phaser.Math.Between(0, width);
            }
        }

        // Connection indicator
        if (socketManager.connected) {
            this.connDot.setFillStyle(0x66aa66);
            this.connLabel.setText('Connected');
        } else {
            this.connDot.setFillStyle(0xcc4444);
            this.connLabel.setText('Disconnected');
        }
    }

    // ─── UI Helpers ───
    createInputOverlay(title, defaultValue, callback) {
        // Clear existing overlays
        const existing = document.querySelector('.input-overlay');
        if (existing) existing.remove();

        const uiLayer = document.getElementById('ui-layer');
        const container = document.createElement('div');
        container.className = 'input-overlay';

        const header = document.createElement('h3');
        header.innerText = title;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = defaultValue;
        input.maxLength = 12;

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';
        btnContainer.style.justifyContent = 'center';

        const submitBtn = document.createElement('button');
        submitBtn.innerText = 'OK';

        const cancelBtn = document.createElement('button');
        cancelBtn.innerText = 'Cancel';

        btnContainer.appendChild(cancelBtn);
        btnContainer.appendChild(submitBtn);

        container.appendChild(header);
        container.appendChild(input);
        container.appendChild(btnContainer);
        uiLayer.appendChild(container);

        input.focus();

        const close = () => {
            container.remove();
        };

        const submit = () => {
            const val = input.value.trim();
            if (val) callback(val);
            close();
        };

        submitBtn.onclick = submit;
        cancelBtn.onclick = close;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') close();
        };
    }

    showNameInput() {
        this.createInputOverlay('Enter Name:', this.playerName, (name) => {
            this.playerName = name.slice(0, 12);
            localStorage.setItem('playerName', this.playerName);
            this.nameDisplay.setText(`Name: ${this.playerName}`);
        });
    }

    showJoinInput() {
        if (!socketManager.connected) {
            this.statusText.setText('Connecting to server...');
            return;
        }
        this.createInputOverlay('Enter Room Code:', '', (code) => {
            socketManager.joinRoom(code, this.playerName);
        });
    }

    requestRoomList() {
        if (socketManager.connected) {
            socketManager.socket.emit('requestRoomList');
        }
    }

    displayRoomList(rooms) {
        const { width } = this.cameras.main;

        // Clear existing room entries
        this.roomListContainer.removeAll(true);

        if (!rooms || rooms.length === 0) {
            this.roomListText.setText('No open rooms. Create one!');
            return;
        }

        this.roomListText.setText('');

        rooms.forEach((room, i) => {
            const y = i * 32;
            const bg = this.add.rectangle(width / 2, y + 14, 350, 28, 0x1a1a24, 0.8)
                .setInteractive({ useHandCursor: true });

            const text = this.add.text(width / 2 - 150, y + 14,
                `Room ${room.roomId}   ${room.playerCount}/6 players`, {
                fontFamily: 'Courier New',
                fontSize: '12px',
                color: '#bbaa88',
            }).setOrigin(0, 0.5);

            const joinBtn = this.add.text(width / 2 + 130, y + 14, '[JOIN]', {
                fontFamily: 'Courier New',
                fontSize: '11px',
                color: '#88cc88',
            }).setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            bg.on('pointerover', () => bg.setFillStyle(0x2a2a3a));
            bg.on('pointerout', () => bg.setFillStyle(0x1a1a24));
            bg.on('pointerdown', () => {
                socketManager.joinRoom(room.roomId, this.playerName);
            });
            joinBtn.on('pointerdown', () => {
                socketManager.joinRoom(room.roomId, this.playerName);
            });

            this.roomListContainer.add([bg, text, joinBtn]);
        });
    }

    createRoom() {
        if (!socketManager.connected) {
            this.statusText.setText('Connecting to server...');
            return;
        }
        socketManager.joinRoom(null, this.playerName);
    }

    shutdown() {
        // Remove any lingering overlays
        const existing = document.querySelector('.input-overlay');
        if (existing) existing.remove();

        socketManager.off(MSG.S_ROOM_STATE);
        socketManager.off(MSG.S_ERROR);
        socketManager.off('roomList');
    }
}
