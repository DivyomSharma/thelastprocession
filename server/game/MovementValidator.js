// ─── Movement Validator ─────────────────────────────────────
// Validates and applies player movement on the server.

import { PLAYER_SPEED, TICK_INTERVAL, TILE_SIZE } from '../../shared/constants.js';

export default class MovementValidator {
    constructor(collisionMap) {
        this.collisionMap = collisionMap;
    }

    /**
     * Validate and apply a movement input from a client.
     * @param {PlayerState} player
     * @param {{ dx: number, dy: number }} input - normalized direction
     * @param {number} deltaMs - time since last tick in ms
     * @returns {{ x, y, direction, isMoving }}
     */
    applyMovement(player, input, deltaMs) {
        let { dx, dy } = input;

        // ─── Possession Effect: Movement Glitches (Stage 3+) ───
        if (player.attunement > 75) {
            // 5% chance to ignore input or move randomly
            if (Math.random() < 0.05) {
                // Randomize direction
                dx = (Math.random() - 0.5) * 2;
                dy = (Math.random() - 0.5) * 2;
            }
        }

        // Clamp input to -1...1
        const cdx = Math.max(-1, Math.min(1, dx));
        const cdy = Math.max(-1, Math.min(1, dy));

        const isMoving = cdx !== 0 || cdy !== 0;

        if (!isMoving) {
            player.isMoving = false;
            return { x: player.x, y: player.y, direction: player.direction, isMoving: false };
        }

        // Normalize diagonal movement
        let magnitude = Math.sqrt(cdx * cdx + cdy * cdy);
        if (magnitude > 1) magnitude = 1;

        const speed = PLAYER_SPEED * (deltaMs / 1000);
        const moveX = (cdx / (magnitude || 1)) * speed;
        const moveY = (cdy / (magnitude || 1)) * speed;

        let newX = player.x + moveX;
        let newY = player.y + moveY;

        // Determine direction for sprite facing
        let direction = player.direction;
        if (Math.abs(cdx) >= Math.abs(cdy)) {
            direction = cdx > 0 ? 'right' : 'left';
        } else {
            direction = cdy > 0 ? 'down' : 'up';
        }

        // Collision check — try full move, then axis-separated
        if (this.collisionMap.canMoveTo(newX, newY)) {
            player.x = newX;
            player.y = newY;
        } else if (this.collisionMap.canMoveTo(newX, player.y)) {
            player.x = newX;
        } else if (this.collisionMap.canMoveTo(player.x, newY)) {
            player.y = newY;
        }
        // else: no movement (stuck)

        player.direction = direction;
        player.isMoving = true;

        return { x: player.x, y: player.y, direction, isMoving: true };
    }
}
