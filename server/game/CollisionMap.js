// ─── Collision Map ──────────────────────────────────────────
// Server-side collision checking against tilemap data.

import { TILE_SIZE } from '../../shared/constants.js';

export default class CollisionMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = []; // 2D array: 0 = walkable, 1 = blocked
    }

    /** Load collision data from Tiled JSON layer */
    loadFromTiledLayer(layerData, mapWidth, mapHeight) {
        this.width = mapWidth;
        this.height = mapHeight;
        this.grid = [];

        for (let y = 0; y < mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                const tileId = layerData[y * mapWidth + x];
                this.grid[y][x] = tileId > 0 ? 1 : 0;
            }
        }
    }

    /** Generate the default 30x30 village map with walls + buildings */
    loadDefault(mapWidth, mapHeight) {
        this.width = mapWidth;
        this.height = mapHeight;
        this.grid = [];

        // Building definitions (must match client-side GameScene.isBuilding)
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

        for (let y = 0; y < mapHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < mapWidth; x++) {
                // Border walls
                if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
                    this.grid[y][x] = 1;
                    continue;
                }

                // Buildings
                let isBuilding = false;
                for (const b of buildings) {
                    if (x >= b.bx && x < b.bx + b.w && y >= b.by && y < b.by + b.h) {
                        isBuilding = true;
                        break;
                    }
                }
                this.grid[y][x] = isBuilding ? 1 : 0;
            }
        }
    }

    /** Check if a pixel-position is walkable */
    isWalkable(pixelX, pixelY) {
        const tileX = Math.floor(pixelX / TILE_SIZE);
        const tileY = Math.floor(pixelY / TILE_SIZE);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }

        return this.grid[tileY][tileX] === 0;
    }

    /** Check if a bounding box can move to a position (4-corner check) */
    canMoveTo(pixelX, pixelY, halfWidth = 12, halfHeight = 12) {
        return (
            this.isWalkable(pixelX - halfWidth, pixelY - halfHeight) &&
            this.isWalkable(pixelX + halfWidth, pixelY - halfHeight) &&
            this.isWalkable(pixelX - halfWidth, pixelY + halfHeight) &&
            this.isWalkable(pixelX + halfWidth, pixelY + halfHeight)
        );
    }
}
