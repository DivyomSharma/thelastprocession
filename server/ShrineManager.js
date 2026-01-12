/**
 * THE LAST PROCESSION - Shrine Manager
 * Tracks shrine states and validates ritual completion
 */

export class ShrineManager {
    constructor() {
        // Define 7 shrines with positions
        this.shrines = [
            { id: 0, name: 'Church', position: { x: -20, y: 0, z: 0 }, lit: false, valid: false, litBy: null },
            { id: 1, name: 'Well', position: { x: 0, y: 0, z: 20 }, lit: false, valid: false, litBy: null },
            { id: 2, name: 'Mill', position: { x: 20, y: 0, z: 0 }, lit: false, valid: false, litBy: null },
            { id: 3, name: 'Graveyard', position: { x: 0, y: 0, z: -20 }, lit: false, valid: false, litBy: null },
            { id: 4, name: 'Forest Left', position: { x: -30, y: 0, z: 30 }, lit: false, valid: false, litBy: null },
            { id: 5, name: 'Forest Right', position: { x: 30, y: 0, z: 30 }, lit: false, valid: false, litBy: null },
            { id: 6, name: 'Hilltop Altar', position: { x: 0, y: 5, z: 50 }, lit: false, valid: false, litBy: null }
        ];
    }

    /**
     * Light a shrine - validates based on role
     */
    lightShrine(shrineId, playerId, role) {
        const shrine = this.shrines[shrineId];

        if (!shrine) {
            return { success: false, error: 'Invalid shrine' };
        }

        if (shrine.lit) {
            return { success: false, error: 'Shrine already lit' };
        }

        // Shrine appears lit regardless of role
        shrine.lit = true;
        shrine.litBy = playerId;

        // But only villagers light it validly
        if (role === 'villager') {
            shrine.valid = true;
            console.log(`Shrine ${shrine.name} lit VALIDLY by villager ${playerId}`);
        } else {
            shrine.valid = false; // Corrupted - appears same but doesn't count
            console.log(`Shrine ${shrine.name} CORRUPTED by hollow ${playerId}`);
        }

        return { success: true, shrineId, valid: shrine.valid };
    }

    /**
     * Get public state (what clients see)
     * Never reveals valid/invalid status
     */
    getPublicState() {
        return this.shrines.map(shrine => ({
            id: shrine.id,
            name: shrine.name,
            position: shrine.position,
            lit: shrine.lit
        }));
    }

    /**
     * Get true state (for server logic and end-game reveal)
     */
    getTrueState() {
        return this.shrines.map(shrine => ({
            id: shrine.id,
            name: shrine.name,
            lit: shrine.lit,
            valid: shrine.valid,
            litBy: shrine.litBy
        }));
    }

    /**
     * Check if ALL shrines are validly lit
     */
    isRitualComplete() {
        return this.shrines.every(shrine => shrine.valid);
    }

    /**
     * Get count of lit vs valid shrines
     */
    getShrineStatus() {
        let lit = 0;
        let valid = 0;
        this.shrines.forEach(shrine => {
            if (shrine.lit) lit++;
            if (shrine.valid) valid++;
        });
        return { lit, valid, total: this.shrines.length };
    }

    /**
     * Get altar position (Shrine 7)
     */
    getAltarPosition() {
        return this.shrines[6].position;
    }

    /**
     * Get shrine by ID
     */
    getShrine(shrineId) {
        return this.shrines[shrineId] || null;
    }

    /**
     * Check if player is near a shrine
     */
    getNearbyShrine(position, maxDistance = 3) {
        for (const shrine of this.shrines) {
            const dx = position.x - shrine.position.x;
            const dz = position.z - shrine.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance <= maxDistance) {
                return shrine;
            }
        }
        return null;
    }
}
