// ─── Player State ───────────────────────────────────────────
// Server-authoritative player state. Hidden fields never sent to clients.

import { ATTUNEMENT } from '../../shared/constants.js';

export default class PlayerState {
    constructor(id, socketId, displayName) {
        // ─── Public (broadcast to all clients) ───
        this.id = id;
        this.socketId = socketId;
        this.displayName = displayName;
        this.x = 0;
        this.y = 0;
        this.direction = 'down';
        this.isMoving = false;
        this.interacting = null;      // null | 'shrine' | 'bell' | 'relic'
        this.carryingRelic = null;
        this.isReady = false;

        // ─── Hidden (NEVER sent to any client) ───
        this.attunement = 0;
        this.possessionStage = 0;     // 0=clean, 1=touched, 2=called, 3=vessel
        this.ritualActions = [];
        this.inDarkness = false;
        this.isAlone = false;
        this.lastHeartbeat = Date.now();
    }

    /** Get only the public state safe to broadcast */
    toPublic() {
        return {
            id: this.id,
            displayName: this.displayName,
            x: this.x,
            y: this.y,
            direction: this.direction,
            isMoving: this.isMoving,
            interacting: this.interacting,
            carryingRelic: this.carryingRelic,
        };
    }

    /** Update possession stage based on current attunement */
    updatePossessionStage() {
        const prev = this.possessionStage;
        if (this.attunement >= ATTUNEMENT.STAGE_3) {
            this.possessionStage = 3;
        } else if (this.attunement >= ATTUNEMENT.STAGE_2) {
            this.possessionStage = 2;
        } else if (this.attunement >= ATTUNEMENT.STAGE_1) {
            this.possessionStage = 1;
        } else {
            this.possessionStage = 0;
        }
        return this.possessionStage !== prev; // true if stage changed
    }

    /** Modify attunement, clamped to 0–100 */
    addAttunement(amount) {
        this.attunement = Math.max(0, Math.min(ATTUNEMENT.MAX, this.attunement + amount));
        return this.updatePossessionStage();
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    setSpawn(x, y) {
        this.x = x;
        this.y = y;
        this.direction = 'down';
        this.isMoving = false;
    }
}
