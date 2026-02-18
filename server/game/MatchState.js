// ─── Match State ────────────────────────────────────────────
// Server-authoritative match state for a single room.

import { MATCH_DURATION, TILE_SIZE } from '../../shared/constants.js';

export class MatchState {
    constructor() {
        this.phase = 'lobby';        // 'lobby' | 'playing' | 'ended'
        this.timer = MATCH_DURATION; // seconds remaining
        this.progress = 0;           // 0–100 ritual progress

        // Shrines placed around the village
        this.shrines = this.generateShrines();

        // Bells (Phase 4+)
        this.bells = [];

        // Relics (Phase 4+)
        this.relics = [];
    }

    generateShrines() {
        // 7 shrines placed around the 30×30 map
        const cx = 15 * TILE_SIZE;
        const cy = 15 * TILE_SIZE;
        const positions = [
            { x: 4 * TILE_SIZE, y: 4 * TILE_SIZE },
            { x: 25 * TILE_SIZE, y: 4 * TILE_SIZE },
            { x: 4 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: 25 * TILE_SIZE, y: 25 * TILE_SIZE },
            { x: cx, y: 3 * TILE_SIZE },
            { x: cx, y: 27 * TILE_SIZE },
            { x: cx, y: cy },  // Center shrine
        ];

        return positions.map((pos, i) => ({
            id: `shrine_${i}`,
            x: pos.x,
            y: pos.y,
            activated: false,
            activatedBy: null,
        }));
    }

    /** Public state (safe to send to clients) */
    toPublic() {
        return {
            phase: this.phase,
            timer: Math.ceil(this.timer),
            progress: this.progress,
            shrines: this.shrines.map(s => ({
                id: s.id,
                x: s.x,
                y: s.y,
                activated: s.activated,
            })),
        };
    }
}
