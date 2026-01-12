/**
 * THE LAST PROCESSION - Voting Manager
 * Handles accusation voting and exile mechanics
 */

export class VotingManager {
    constructor(playerIds) {
        this.playerIds = new Set(playerIds);
        this.votes = new Map(); // voterId -> targetId
        this.isVotingActive = false;
    }

    /**
     * Start a new voting session
     */
    startVoting() {
        this.votes.clear();
        this.isVotingActive = true;
    }

    /**
     * Cast a vote
     */
    castVote(voterId, targetId) {
        if (!this.isVotingActive) {
            return { success: false, error: 'Voting not active' };
        }

        if (!this.playerIds.has(voterId)) {
            return { success: false, error: 'Invalid voter' };
        }

        // Target can be null (skip vote) or a valid player
        if (targetId !== null && !this.playerIds.has(targetId)) {
            return { success: false, error: 'Invalid target' };
        }

        // Can't vote for yourself
        if (targetId === voterId) {
            return { success: false, error: 'Cannot vote for yourself' };
        }

        this.votes.set(voterId, targetId);
        return { success: true };
    }

    /**
     * Check if all active players have voted
     */
    allVotesIn() {
        return this.votes.size >= this.playerIds.size;
    }

    /**
     * Get count of remaining votes needed
     */
    getRemainingVotes() {
        return this.playerIds.size - this.votes.size;
    }

    /**
     * Resolve voting and determine who (if anyone) is exiled
     */
    resolveVotes() {
        this.isVotingActive = false;

        // Count votes for each target
        const voteCounts = new Map();
        let skipVotes = 0;

        this.votes.forEach((targetId, voterId) => {
            if (targetId === null) {
                skipVotes++;
            } else {
                voteCounts.set(targetId, (voteCounts.get(targetId) || 0) + 1);
            }
        });

        // Find highest vote count
        let maxVotes = skipVotes;
        let exiled = null;
        let tie = false;

        voteCounts.forEach((count, targetId) => {
            if (count > maxVotes) {
                maxVotes = count;
                exiled = targetId;
                tie = false;
            } else if (count === maxVotes && count > 0) {
                tie = true;
            }
        });

        // If it's a tie, no one is exiled
        if (tie) {
            exiled = null;
        }

        // Remove exiled player from future voting
        if (exiled) {
            this.playerIds.delete(exiled);
        }

        // Prepare vote breakdown for reveal
        const voteBreakdown = {};
        this.votes.forEach((targetId, voterId) => {
            voteBreakdown[voterId] = targetId;
        });

        return {
            votes: voteBreakdown,
            exiled,
            tie,
            skipVotes,
            voteCounts: Object.fromEntries(voteCounts)
        };
    }

    /**
     * Get current voting status
     */
    getStatus() {
        return {
            isActive: this.isVotingActive,
            votesIn: this.votes.size,
            totalVoters: this.playerIds.size
        };
    }

    /**
     * Remove a player (disconnected or exiled)
     */
    removePlayer(playerId) {
        this.playerIds.delete(playerId);
        this.votes.delete(playerId);
    }
}
