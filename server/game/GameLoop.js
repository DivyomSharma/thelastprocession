// ─── Game Loop ──────────────────────────────────────────────
// Authoritative server tick loop (15 Hz) for a single room.

import { TICK_INTERVAL } from '../../shared/constants.js';
import MovementValidator from './MovementValidator.js';
import CollisionMap from './CollisionMap.js';
import { createLogger } from '../utils/logger.js';
import * as MSG from '../../shared/messageTypes.js';
import AttunementManager from './mechanics/AttunementManager.js';

const log = createLogger('GameLoop');

export class GameLoop {
    constructor(room, io) {
        this.room = room;
        this.io = io;
        this.intervalId = null;
        this.lastTick = Date.now();

        // Collision map for the 30x30 tile map
        this.collisionMap = new CollisionMap(30, 30);
        this.collisionMap.loadDefault(30, 30);

        this.movementValidator = new MovementValidator(this.collisionMap);

        // Input buffer: playerId → { dx, dy }
        this.inputBuffer = new Map();

        this.attunementManager = new AttunementManager();
    }

    start() {
        this.lastTick = Date.now();

        log.info(`Starting game loop for room ${this.room.id}`);

        this.intervalId = setInterval(() => {
            this.tick();
        }, TICK_INTERVAL);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        log.info(`Stopped game loop for room ${this.room.id}`);
    }

    /** Buffer an input from a player */
    queueInput(playerId, input) {
        this.inputBuffer.set(playerId, input);
    }

    /** Main server tick */
    tick() {
        const now = Date.now();
        const deltaMs = now - this.lastTick;
        this.lastTick = now;

        const match = this.room.matchState;

        // ─── Update timer ───
        match.timer -= deltaMs / 1000;
        if (match.timer <= 0) {
            match.timer = 0;
            this.endGame('time_expired');
            return;
        }

        // ─── Process movement for all players ───
        const players = this.room.players;
        for (const id of Object.keys(players)) {
            const player = players[id];
            const input = this.inputBuffer.get(id) || { dx: 0, dy: 0 };
            this.movementValidator.applyMovement(player, input, deltaMs);
        }

        // ─── Update Attunement ───
        const attunementEvents = this.attunementManager.update(this.room.matchState, deltaMs / 1000);

        if (attunementEvents && attunementEvents.length > 0) {
            attunementEvents.forEach(event => {
                const socketId = this.room.players[event.playerId]?.socketId;
                if (socketId) {
                    this.io.to(socketId).emit(MSG.S_ATTUNEMENT_HINT, {
                        level: event.level,
                        type: event.type
                    });
                }
            });
        }

        // ─── Broadcast state snapshot ───
        this.broadcastState();

        // ─── Check Win/Loss Condition (Phase 4) ───
        const result = match.checkWinCondition(this.room.players);
        if (result) {
            this.endGame(result);
        }
    }

    /** Send current state to all players in the room */
    broadcastState() {
        // ... (existing code)
        const players = {};
        for (const [id, player] of Object.entries(this.room.players)) {
            players[id] = {
                id: player.id,
                x: Math.round(player.x * 10) / 10,
                y: Math.round(player.y * 10) / 10,
                displayName: player.displayName,
                isAlive: player.isAlive,
                // Include bells/relics in detailed state broadcast if needed, 
                // but usually better to send diffs. For now, we rely on MatchState.toPublic() 
                // but we need to actually SEND it.
                // WAIT: broadcastState currently constructs a custom object. 
                // We should merge MatchState.toPublic result.
            };
        }

        // Merge match state
        const publicMatchState = this.room.matchState.toPublic();

        this.io.to(this.room.id).emit(MSG.S_STATE_UPDATE, {
            players,
            timeLeft: Math.ceil(this.room.matchState.timer),
            progress: this.room.matchState.progress,
            ...publicMatchState // bells, relics, nextExpectedIndex
        });
    }

    endGame(reason) {
        this.stop();

        let message = 'Game Over';
        if (reason === 'survivors') {
            message = 'The Ritual is Complete. The Village is Cleanse.';
        } else if (reason === 'entity') {
            message = 'Total Possession. The Entity Feasts.';
        } else if (reason === 'time_expired') {
            message = 'Darkness Consumes All. Time ran out.';
        }

        this.io.to(this.room.id).emit(MSG.S_GAME_OVER, {
            result: reason,
            message,
        });

        // this.room.endGame(reason); // Basic cleanup
        log.info(`Game over in room ${this.room.id}: ${reason}`);
    }
}
