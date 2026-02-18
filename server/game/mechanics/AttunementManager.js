import { TILE_SIZE } from '../../../shared/constants.js';

export default class AttunementManager {
    constructor() {
        // Configuration
        this.ISOLATION_DISTANCE = TILE_SIZE * 5; // Distance to be considered "alone"
        this.ISOLATION_RATE = 5.0; // Attunement gained per second when alone
        this.PROXIMITY_RATE = -2.0; // Attunement lost per second when near others
        this.MAX_ATTUNEMENT = 100;
        this.MIN_ATTUNEMENT = 0;

        // Thresholds for sending hints to client
        this.THRESHOLDS = [25, 50, 75, 90];
    }

    /**
     * Updates attunement for all players
     * @param {Object} matchState - The current match state
     * @param {number} dt - Delta time in seconds
     */
    update(matchState, dt) {
        const events = [];
        const players = Object.values(matchState.players);

        players.forEach(player => {
            if (!player.isAlive) return;

            // Check for nearby players
            let isIsolated = true;
            for (const other of players) {
                if (other.id === player.id || !other.isAlive) continue;

                const dx = other.x - player.x;
                const dy = other.y - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.ISOLATION_DISTANCE) {
                    isIsolated = false;
                    break;
                }
            }

            // Update value
            const change = isIsolated ? this.ISOLATION_RATE : this.PROXIMITY_RATE;
            const previousValue = player.attunement;

            // Ensure attunement stays within bounds
            player.attunement = Math.max(this.MIN_ATTUNEMENT, Math.min(this.MAX_ATTUNEMENT, (player.attunement || 0) + change * dt));

            // Check for thresholds
            const event = this.checkThresholds(player, previousValue);
            if (event) {
                events.push(event);
            }
        });

        return events;
    }

    checkThresholds(player, previousValue) {
        // Check if we crossed a threshold upwards
        for (const threshold of this.THRESHOLDS) {
            if (previousValue < threshold && player.attunement >= threshold) {
                // Return data to be sent to client (will be handled by GameLoop/Socket)
                return {
                    playerId: player.id,
                    type: 'ATTUNEMENT_INCREASE',
                    level: threshold
                };
            }
        }
        return null;
    }
}
