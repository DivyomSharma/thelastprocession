// ─── End Scene ──────────────────────────────────────────────
// Displays game results with thematic messaging.

import Phaser from 'phaser';
import socketManager from '../network/socketManager.js';

export default class EndScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndScene' });
    }

    init(data) {
        this.result = data.result || 'unknown';
        this.message = data.message || 'The ritual has ended.';
    }

    create() {
        const { width, height } = this.cameras.main;
        this.cameras.main.setBackgroundColor('#0a0a0f');

        const isVillagerWin = this.result === 'survivors';

        // Icon
        this.add.text(width / 2, height / 2 - 70,
            isVillagerWin ? '🕯' : '💀', {
            fontSize: '48px',
        }).setOrigin(0.5);

        // Title
        this.add.text(width / 2, height / 2 - 25,
            isVillagerWin ? 'THE RITUAL IS COMPLETE' : 'DARKNESS PREVAILS', {
            fontFamily: 'Courier New',
            fontSize: '22px',
            color: isVillagerWin ? '#ccaa66' : '#cc4444',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // Message
        this.add.text(width / 2, height / 2 + 10, this.message, {
            fontFamily: 'Courier New',
            fontSize: '12px',
            color: '#998877',
            wordWrap: { width: 350 },
            align: 'center',
        }).setOrigin(0.5);

        // Horizontal rule
        this.add.rectangle(width / 2, height / 2 + 50, 200, 1, 0x333333);

        // Return button
        this.add.text(width / 2, height / 2 + 80, '[ RETURN TO MENU ]', {
            fontFamily: 'Courier New',
            fontSize: '14px',
            color: '#886655',
            backgroundColor: '#1e1e2a',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', function () { this.setStyle({ color: '#ccaa88', backgroundColor: '#2a2a3a' }); })
            .on('pointerout', function () { this.setStyle({ color: '#886655', backgroundColor: '#1e1e2a' }); })
            .on('pointerdown', () => {
                socketManager.leaveRoom();
                this.scene.start('MenuScene');
            });

        // Atmospheric particles
        for (let i = 0; i < 12; i++) {
            const particle = this.add.rectangle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                1, 1,
                isVillagerWin ? 0xffcc66 : 0x660000
            ).setAlpha(Phaser.Math.FloatBetween(0.1, 0.4));

            this.tweens.add({
                targets: particle,
                y: particle.y - Phaser.Math.Between(40, 120),
                alpha: 0,
                duration: Phaser.Math.Between(3000, 6000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                onRepeat: () => {
                    particle.x = Phaser.Math.Between(0, width);
                    particle.y = height + 10;
                    particle.alpha = Phaser.Math.FloatBetween(0.1, 0.4);
                },
            });
        }
    }
}
