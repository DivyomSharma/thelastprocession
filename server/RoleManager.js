/**
 * THE LAST PROCESSION - Role Manager
 * Handles secret role assignment and protection
 */

export class RoleManager {
    constructor(playerIds) {
        this.roles = new Map();
        this.assignRoles(playerIds);
    }

    /**
     * Randomly assign roles - 1 Hollow, rest are Villagers
     */
    assignRoles(playerIds) {
        // Shuffle player IDs
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5);

        // First player becomes The Hollow
        shuffled.forEach((playerId, index) => {
            this.roles.set(playerId, index === 0 ? 'hollow' : 'villager');
        });

        console.log(`Roles assigned: Hollow is ${shuffled[0]}`);
    }

    /**
     * Get a player's role (only server should call this)
     */
    getRole(playerId) {
        return this.roles.get(playerId) || 'villager';
    }

    /**
     * Check if a player is the Hollow
     */
    isHollow(playerId) {
        return this.roles.get(playerId) === 'hollow';
    }

    /**
     * Get the Hollow's player ID (for end-game reveal)
     */
    getHollowId() {
        for (const [playerId, role] of this.roles.entries()) {
            if (role === 'hollow') {
                return playerId;
            }
        }
        return null;
    }

    /**
     * Get all roles (for end-game reveal only)
     */
    getAllRoles() {
        const result = {};
        this.roles.forEach((role, playerId) => {
            result[playerId] = role;
        });
        return result;
    }

    /**
     * Get player count by role
     */
    getRoleCounts() {
        let villagers = 0;
        let hollow = 0;
        this.roles.forEach(role => {
            if (role === 'hollow') hollow++;
            else villagers++;
        });
        return { villagers, hollow };
    }
}
