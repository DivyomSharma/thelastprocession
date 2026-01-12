/**
 * THE LAST PROCESSION - Game State Manager
 * Manages shared game state (faith, timer, win conditions)
 */

export class GameState {
    constructor(playerCount) {
        this.playerCount = playerCount;
        this.faith = 100; // Shared faith pool (0-100)
        this.vesselPlaced = false;
        this.startTime = Date.now();

        // Blessed path definition (rectangular zones)
        this.blessedPaths = [
            // Village square
            { minX: -10, maxX: 10, minZ: -10, maxZ: 10 },
            // Path to church (Shrine 1)
            { minX: -25, maxX: -15, minZ: -5, maxZ: 5 },
            // Path to well (Shrine 2)
            { minX: -5, maxX: 5, minZ: 10, maxZ: 25 },
            // Path to mill (Shrine 3)
            { minX: 15, maxX: 25, minZ: -5, maxZ: 5 },
            // Path to graveyard (Shrine 4)
            { minX: -5, maxX: 5, minZ: -25, maxZ: -10 },
            // Forest path left (Shrine 5)
            { minX: -35, maxX: -20, minZ: 10, maxZ: 35 },
            // Forest path right (Shrine 6)
            { minX: 20, maxX: 35, minZ: 10, maxZ: 35 },
            // Hilltop path (Shrine 7)
            { minX: -8, maxX: 8, minZ: 35, maxZ: 55 }
        ];
    }

    /**
     * Check if a position is on a blessed path
     */
    isOnBlessedPath(position) {
        for (const path of this.blessedPaths) {
            if (position.x >= path.minX && position.x <= path.maxX &&
                position.z >= path.minZ && position.z <= path.maxZ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Drain faith (when off path, failed vote, etc.)
     */
    drainFaith(amount) {
        this.faith = Math.max(0, this.faith - amount);
        return this.faith;
    }

    /**
     * Add faith (lighting shrines, completing objectives)
     */
    addFaith(amount) {
        this.faith = Math.min(100, this.faith + amount);
        return this.faith;
    }

    /**
     * Get current faith level
     */
    getFaith() {
        return this.faith;
    }

    /**
     * Check if faith has depleted (hollow win condition)
     */
    isFaithDepleted() {
        return this.faith <= 0;
    }

    /**
     * Get elapsed time in milliseconds
     */
    getElapsedTime() {
        return Date.now() - this.startTime;
    }

    /**
     * Get faith level category for effects
     */
    getFaithLevel() {
        if (this.faith >= 70) return 'high';
        if (this.faith >= 40) return 'medium';
        if (this.faith >= 20) return 'low';
        return 'critical';
    }

    /**
     * Serialize state for network
     */
    toJSON() {
        return {
            faith: this.faith,
            vesselPlaced: this.vesselPlaced,
            elapsed: this.getElapsedTime(),
            faithLevel: this.getFaithLevel()
        };
    }
}
