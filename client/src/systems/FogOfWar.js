// ─── Fog of War System ──────────────────────────────────────
// Dark overlay with punched-out light radius circles.
// Uses a RenderTexture for efficient per-frame updates.

import Phaser from 'phaser';
import { TILE_SIZE } from '../config.js';

export default class FogOfWar {
    constructor(scene, mapWidth, mapHeight) {
        this.scene = scene;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;

        const totalW = mapWidth * TILE_SIZE;
        const totalH = mapHeight * TILE_SIZE;

        // Create the dark overlay as a RenderTexture
        this.rt = scene.add.renderTexture(0, 0, totalW, totalH);
        this.rt.setOrigin(0, 0);
        this.rt.setDepth(50); // above everything except UI
        this.rt.setScrollFactor(1);

        // Create a soft radial gradient texture for light holes
        this.createLightGradient();

        // Flicker timer
        this.flickerTime = 0;
    }

    createLightGradient() {
        const size = TILE_SIZE * 12; // large enough for biggest light radius
        const canvas = this.scene.textures.createCanvas('lightGradient', size, size);
        const ctx = canvas.context;

        const cx = size / 2;
        const cy = size / 2;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
        gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        canvas.refresh();

        this.lightImage = this.scene.add.image(0, 0, 'lightGradient');
        this.lightImage.setVisible(false);
    }

    /**
     * Update the fog overlay.
     * @param {Array<{x, y, radius}>} lightSources - pixel positions + radius in tiles
     */
    update(lightSources) {
        this.flickerTime += 0.05;

        // Fill with darkness
        this.rt.fill(0x0a0a0f, 0.92);

        // Erase light circles using 'erase' blending
        for (const source of lightSources) {
            // Add flicker to radius
            const flicker = Math.sin(this.flickerTime + source.x * 0.01) * 0.15;
            const radius = (source.radius + flicker) * TILE_SIZE;

            const diameter = radius * 2;
            this.lightImage.setDisplaySize(diameter, diameter);
            this.lightImage.setPosition(source.x, source.y);

            this.rt.erase(this.lightImage, source.x, source.y);
        }
    }

    destroy() {
        if (this.rt) this.rt.destroy();
        if (this.lightImage) this.lightImage.destroy();
    }
}
