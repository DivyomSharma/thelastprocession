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
        this.assignShrineOrder();

        // Bells (Phase 4/3.4)
        this.bells = this.generateBells();

        // Relics (Phase 4/3.4)
        this.relics = this.generateRelics();
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
            orderIndex: 0 // Assigned below
        }));
    }

    assignShrineOrder() {
        // Shuffle indices 1 to 7
        const indices = [1, 2, 3, 4, 5, 6, 7];
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        this.shrines.forEach((shrine, i) => {
            shrine.orderIndex = indices[i];
        });

        this.nextExpectedIndex = 1;
    }

    generateBells() {
        // 3 Bells: Center, Top-Left, Bottom-Right
        const cx = 30 * 32 / 2;
        const cy = 30 * 32 / 2;
        return [
            { id: 'bell_center', x: cx, y: cy, cooldown: 0 },
            { id: 'bell_nw', x: 5 * 32, y: 5 * 32, cooldown: 0 },
            { id: 'bell_se', x: 25 * 32, y: 25 * 32, cooldown: 0 }
        ];
    }

    generateRelics() {
        // 5 Relics in random "dark" spots (away from center)
        const relics = [];
        const cx = 15; // tiles
        const cy = 15;

        for (let i = 0; i < 5; i++) {
            let rx, ry;
            let valid = false;
            while (!valid) {
                rx = Math.floor(Math.random() * 28) + 1;
                ry = Math.floor(Math.random() * 28) + 1;
                // Must be > 10 tiles from center
                if (Math.abs(rx - cx) > 10 || Math.abs(ry - cy) > 10) {
                    valid = true;
                }
            }
            relics.push({
                id: `relic_${i}`,
                x: rx * 32 + 16,
                y: ry * 32 + 16,
                active: true
            });
        }
        return relics;
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
                orderIndex: s.orderIndex
            })),
            bells: this.bells.map(b => ({ id: b.id, x: b.x, y: b.y, cooldown: b.cooldown })),
            relics: this.relics.filter(r => r.active).map(r => ({ id: r.id, x: r.x, y: r.y })),
            nextExpectedIndex: this.nextExpectedIndex
        };
    }

    checkWinCondition(players) {
        // VICTORY: All 7 shrines activated
        if (this.nextExpectedIndex > 7) {
            return 'survivors';
        }

        // DEFEAT: All connected players are 100% possessed
        const connectedPlayers = Object.values(players).filter(p => !p.disconnected);
        if (connectedPlayers.length > 0) {
            const allPossessed = connectedPlayers.every(p => (p.attunement || 0) >= 100);
            if (allPossessed) {
                return 'entity';
            }
        }

        return null; // Game continues
    }
}
