// ─── Boot Scene ─────────────────────────────────────────────
// Asset loading + runtime placeholder sprite generation.
// Generates 6 villager variants, tiles, shrines, torches, bells.

import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Loading bar
        const { width, height } = this.cameras.main;
        const bar = this.add.rectangle(width / 2, height / 2, 0, 16, 0xcc8844);
        const outline = this.add.rectangle(width / 2, height / 2, 204, 20).setStrokeStyle(1, 0x665533);

        this.load.on('progress', (val) => {
            bar.width = 200 * val;
        });

        // Generate all placeholder textures
        this.generateSprites();
    }

    create() {
        this.scene.start('MenuScene');
    }

    generateSprites() {
        const size = 32;

        // ─── 6 Villager variants ───
        const villagerPalettes = [
            { skin: '#c9a882', hair: '#4a3728', robe: '#8b7355', name: 'Elder' },
            { skin: '#d4b896', hair: '#2a1f14', robe: '#6b735b', name: 'Herbalist' },
            { skin: '#bfa07a', hair: '#5a4a3a', robe: '#7b6555', name: 'Smith' },
            { skin: '#c4a080', hair: '#3a2a1a', robe: '#5b6373', name: 'Scholar' },
            { skin: '#d0b090', hair: '#6a4a2a', robe: '#73655b', name: 'Farmer' },
            { skin: '#b89870', hair: '#1a1a1a', robe: '#6b5b4b', name: 'Watcher' },
        ];

        villagerPalettes.forEach((palette, idx) => {
            const canvas = this.textures.createCanvas(`villager_${idx}`, size, size);
            const ctx = canvas.context;

            // Body / robe
            ctx.fillStyle = palette.robe;
            ctx.fillRect(8, 14, 16, 16);

            // Arms
            ctx.fillRect(5, 16, 4, 10);
            ctx.fillRect(23, 16, 4, 10);

            // Head
            ctx.fillStyle = palette.skin;
            ctx.fillRect(10, 4, 12, 12);

            // Hair
            ctx.fillStyle = palette.hair;
            ctx.fillRect(10, 3, 12, 4);
            ctx.fillRect(9, 4, 2, 6);
            ctx.fillRect(21, 4, 2, 6);

            // Eyes (dark, hollow)
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(13, 9, 2, 2);
            ctx.fillRect(18, 9, 2, 2);

            // Mouth (thin line)
            ctx.fillStyle = '#3a2a2a';
            ctx.fillRect(14, 13, 4, 1);

            // Feet
            ctx.fillStyle = '#3a3a2a';
            ctx.fillRect(10, 29, 5, 3);
            ctx.fillRect(17, 29, 5, 3);

            canvas.refresh();
        });

        // ─── Grass tile ───
        const grassCanvas = this.textures.createCanvas('tile_grass', size, size);
        const gctx = grassCanvas.context;
        gctx.fillStyle = '#1a2a1a';
        gctx.fillRect(0, 0, size, size);
        // Grass tufts
        for (let i = 0; i < 8; i++) {
            gctx.fillStyle = Phaser.Math.RND.pick(['#1f3318', '#223a1a', '#182e16']);
            gctx.fillRect(
                Phaser.Math.Between(0, size - 3),
                Phaser.Math.Between(0, size - 3),
                2, 3
            );
        }
        grassCanvas.refresh();

        // ─── Path tile ───
        const pathCanvas = this.textures.createCanvas('tile_path', size, size);
        const pctx = pathCanvas.context;
        pctx.fillStyle = '#2a2218';
        pctx.fillRect(0, 0, size, size);
        for (let i = 0; i < 5; i++) {
            pctx.fillStyle = Phaser.Math.RND.pick(['#33291e', '#2e2418']);
            pctx.fillRect(
                Phaser.Math.Between(0, size - 4),
                Phaser.Math.Between(0, size - 4),
                3, 2
            );
        }
        pathCanvas.refresh();

        // ─── Wall tile ───
        const wallCanvas = this.textures.createCanvas('tile_wall', size, size);
        const wctx = wallCanvas.context;
        wctx.fillStyle = '#3a3530';
        wctx.fillRect(0, 0, size, size);
        // Brick lines
        wctx.fillStyle = '#2a2520';
        for (let row = 0; row < 4; row++) {
            wctx.fillRect(0, row * 8 + 7, size, 1);
            const offset = row % 2 === 0 ? 0 : 12;
            wctx.fillRect(offset, row * 8, 1, 8);
            wctx.fillRect(offset + 16, row * 8, 1, 8);
        }
        wallCanvas.refresh();

        // ─── Shrine ───
        const shrineCanvas = this.textures.createCanvas('shrine', size, size);
        const sctx = shrineCanvas.context;
        // Stone base
        sctx.fillStyle = '#554a40';
        sctx.fillRect(6, 18, 20, 14);
        // Pillar
        sctx.fillStyle = '#665a50';
        sctx.fillRect(12, 4, 8, 18);
        // Cross top
        sctx.fillStyle = '#776a5a';
        sctx.fillRect(8, 4, 16, 4);
        // Candle glow
        sctx.fillStyle = '#ffcc44';
        sctx.fillRect(15, 1, 2, 3);
        shrineCanvas.refresh();

        // ─── Shrine (activated) ───
        const shrineActiveCanvas = this.textures.createCanvas('shrine_active', size, size);
        const sactx = shrineActiveCanvas.context;
        sactx.fillStyle = '#665a50';
        sactx.fillRect(6, 18, 20, 14);
        sactx.fillStyle = '#776a5a';
        sactx.fillRect(12, 4, 8, 18);
        sactx.fillStyle = '#887a6a';
        sactx.fillRect(8, 4, 16, 4);
        // Bright glow
        sactx.fillStyle = '#ffdd66';
        sactx.fillRect(14, 0, 4, 4);
        sactx.fillStyle = '#ffcc44';
        sactx.fillRect(13, 1, 6, 2);
        shrineActiveCanvas.refresh();

        // ─── Torch ───
        const torchCanvas = this.textures.createCanvas('torch', size, size);
        const tctx = torchCanvas.context;
        tctx.fillStyle = '#4a3a2a';
        tctx.fillRect(14, 10, 4, 20);
        tctx.fillStyle = '#cc8833';
        tctx.fillRect(13, 4, 6, 8);
        tctx.fillStyle = '#ffaa33';
        tctx.fillRect(14, 2, 4, 5);
        tctx.fillStyle = '#ffcc66';
        tctx.fillRect(15, 1, 2, 3);
        torchCanvas.refresh();

        // ─── Bell ───
        const bellCanvas = this.textures.createCanvas('bell', size, size);
        const bctx = bellCanvas.context;
        // Frame
        bctx.fillStyle = '#665533';
        bctx.fillRect(10, 4, 12, 3);
        bctx.fillRect(10, 4, 2, 20);
        bctx.fillRect(20, 4, 2, 20);
        // Bell body
        bctx.fillStyle = '#998866';
        bctx.fillRect(12, 8, 8, 12);
        bctx.fillRect(11, 18, 10, 3);
        // Clapper
        bctx.fillStyle = '#554433';
        bctx.fillRect(15, 20, 2, 4);
        bellCanvas.refresh();

        // ─── Light gradient (for fog of war) ───
        const gradSize = 256;
        const gradCanvas = this.textures.createCanvas('light_gradient', gradSize, gradSize);
        const lgctx = gradCanvas.context;
        const gradient = lgctx.createRadialGradient(
            gradSize / 2, gradSize / 2, 0,
            gradSize / 2, gradSize / 2, gradSize / 2
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lgctx.fillStyle = gradient;
        lgctx.fillRect(0, 0, gradSize, gradSize);
        gradCanvas.refresh();


        // ─── Vignette (Possession effect) ───
        const vigSize = 800;
        const vigCanvas = this.textures.createCanvas('vignette', vigSize, vigSize);
        const vctx = vigCanvas.context;
        const vigGrad = vctx.createRadialGradient(
            vigSize / 2, vigSize / 2, vigSize * 0.3,
            vigSize / 2, vigSize / 2, vigSize * 0.8
        );
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        vctx.fillStyle = vigGrad;
        vctx.fillRect(0, 0, vigSize, vigSize);
        vigCanvas.refresh();



        // ─── Relic Texture ───
        const relicCanvas = this.textures.createCanvas('relic', 32, 32);
        const rctx = relicCanvas.context;
        rctx.fillStyle = '#00FFFF'; // Cyan
        rctx.beginPath();
        rctx.arc(16, 16, 10, 0, Math.PI * 2);
        rctx.fill();
        // Glow
        rctx.strokeStyle = '#FFFFFF';
        rctx.lineWidth = 2;
        rctx.stroke();
        relicCanvas.refresh();

        this.scene.start('MenuScene');
    }
}
